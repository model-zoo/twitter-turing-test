"""
Fine-tuning GPT2 on twitter data.

Adapted from
https://github.com/huggingface/transformers/tree/master/examples/language-modeling
"""

import argparse
import logging
import json
import os
import tempfile
from urllib.parse import urlparse

import boto3
import modelzoo.transformers
import torch
from torch.utils.data.dataset import Dataset
from transformers import (
    pipeline,
    AutoModelWithLMHead,
    AutoTokenizer,
    DataCollatorForLanguageModeling,
    PreTrainedTokenizer,
    Trainer,
    TrainingArguments,
)

START = "<|startoftweet|>"
END = "<|endoftweet|>"
UNKNOWN = "<|unk|>"


class TwintDataset(Dataset):
    """
    A dataset that is designed to read twitter data that has been scraped by
    twint [1]. It expects a directory of UTF-8 encoded files. Each file should
    have a single tweet per line, where each tweet is a JSON-encoded dictionary
    where the 'tweet' key holds the tweet.

    [1] https://github.com/twintproject/twint
    """

    def __init__(
        self, tokenizer: PreTrainedTokenizer, directory: str, block_size: int = 1024
    ):
        assert os.path.isdir(directory)
        self.block_size = block_size

        logging.info("Loading data from {} into memory".format(directory))
        files = [os.path.join(directory, f) for f in os.listdir(directory)]
        tweets = []
        for file_path in files:
            with open(file_path, encoding="utf-8") as f:
                tweets.extend(
                    [
                        tokenizer.bos_token
                        + json.loads(line)["tweet"]
                        + tokenizer.eos_token
                        for line in f.read().splitlines()
                        if (len(line) > 0 and not line.isspace())
                    ]
                )

        logging.info("Loaded {} tweets".format(len(tweets)))
        full_text = "".join(tweets)
        tokenized = tokenizer.tokenize(full_text)
        self.tokens = tokenizer.convert_tokens_to_ids(tokenized)
        assert len(self.tokens) > self.block_size
        logging.info("Total number of tokens: {}".format(len(self.tokens)))

        # So that we can have a constant block_size throughout training, we'll
        # drop the remainder of the dataset (if one exists).
        remainder = len(self.tokens) % self.block_size
        if remainder != 0:
            self.tokens = self.tokens[:-remainder]
            logging.info(
                "Dropping {} remainder tokens at end of dataset, new length: {}".format(
                    remainder, len(self.tokens)
                )
            )

        logging.info("Example block: {}".format(tokenized[: self.block_size]))

    def __len__(self):
        return len(self.tokens) - self.block_size

    def __getitem__(self, i) -> torch.Tensor:
        return torch.tensor(self.tokens[i : (i + self.block_size)], dtype=torch.long)


def main(args):
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s -   %(message)s",
        datefmt="%m/%d/%Y %H:%M:%S",
        level=logging.INFO,
    )

    if args.data_path.startswith("s3://"):
        # If downloading data from an S3 URL, download into a temporary
        # directory before training.
        data_dir = tempfile.TemporaryDirectory()
        data_path = data_dir.name

        logging.info("Downloading S3 path {} to {}".format(args.data_path, data_path))
        url = urlparse(args.data_path)
        bucket = boto3.resource("s3").Bucket(url.netloc)
        key = url.path.lstrip("/") + "/"

        for s3_object in bucket.objects.filter(Prefix=key).all():
            if s3_object.key == key:
                continue

            filename = s3_object.key[len(key) :]
            logging.info("Downloading {}...".format(filename))
            bucket.download_file(s3_object.key, os.path.join(data_path, filename))
    else:
        data_path = args.data_path

    # Load pretrained model and tokenizer
    tokenizer = AutoTokenizer.from_pretrained("gpt2")
    logging.info("Length of pre-trained tokenizer {}".format(len(tokenizer)))
    model = AutoModelWithLMHead.from_pretrained("gpt2")

    # Add special tokens to tokenizer and adjust model config accordingly.
    tokenizer.add_special_tokens(
        {"bos_token": START, "eos_token": END, "unk_token": UNKNOWN}
    )
    model.resize_token_embeddings(len(tokenizer))
    model.config.eos_token_id = tokenizer.eos_token_id
    model.config.bos_token_id = tokenizer.bos_token_id

    train_dataset = TwintDataset(tokenizer, data_path, block_size=64)
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_gpu_train_batch_size=int(args.batch_size),
        save_steps=int(args.save_steps),
        num_train_epochs=args.epochs,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=train_dataset,
    )

    trainer.train(model_path="output")

    # We create a TextGenerationPipeline so that we can deploy it into Model Zoo.
    textgen = pipeline("text-generation", model=model, tokenizer=tokenizer)

    # Since GPT2 is a large model with high memory requirements, we
    # override defaults to configure our containers to use 2 GB memory and
    # 1024 CPU units (1 vCPU)
    modelzoo.transformers.deploy(
        textgen,
        model_name="{}".format(args.run_name),
        resources_config=modelzoo.ResourcesConfig(memory_mb=2048, cpu_units=1024),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--run-name",
        required=True,
        help="A unique name to distinguish this training run from "
        "others (e.g. a timestamp). At the end of training, a model will "
        "be uploaded to Model Zoo under this name.",
    )
    parser.add_argument(
        "--data-path",
        required=True,
        help="A path to a directory that contains tweet data to train on. "
        "See the accompanying bash script for the data format. If this "
        "is an s3 path, the data will be downloaded to a temporary directory "
        "before training.",
    )

    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--save-steps", type=int, default=1000)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--output-dir", type=str, default="checkpoints")
    args = parser.parse_args()

    main(args)
