"""
Fine-tuning GPT2 on tweets.

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
    set_seed,
)

from constants import START, END, UNKNOWN


class TwintDataset(Dataset):
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
    # Setup logging
    logging.basicConfig(
        format="%(asctime)s - %(levelname)s - %(name)s -   %(message)s",
        datefmt="%m/%d/%Y %H:%M:%S",
        level=logging.INFO,
    )

    if args.data_path.startswith("s3://"):
        data_dir = tempfile.TemporaryDirectory()
        data_path = data_dir.name

        logging.info("Downloading S3 path {} to {}".format(args.data_path, data_path))
        url = urlparse(args.data_path)
        bucket = boto3.resource("s3").Bucket(url.netloc)
        key = url.path.lstrip("/") + "/"

        # download file into current directory
        for s3_object in bucket.objects.filter(Prefix=key).all():
            if s3_object.key == key:
                continue

            filename = s3_object.key[len(key) :]
            logging.info("Downloading {}...".format(filename))
            bucket.download_file(s3_object.key, os.path.join(data_path, filename))
    else:
        data_path = args.data_path

    # Set seed
    set_seed(0)

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

    # Get datasets
    train_dataset = TwintDataset(tokenizer, data_path, block_size=64)
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)

    # Initialize our Trainer
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        per_gpu_train_batch_size=int(args.batch_size),
        save_steps=int(args.save_steps),
        num_train_epochs=args.epochs,
    )  # For now, use all defaults

    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=train_dataset,
    )

    trainer.train(model_path="output")

    textgen = pipeline("text-generation", model=model, tokenizer=tokenizer)
    modelzoo.transformers.deploy(
        textgen,
        model_name="{}".format(args.run_name),
        resources_config=modelzoo.ResourcesConfig(memory_mb=2048, cpu_units=1024),
        wait_until_healthy=False,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()

    # Required arguments
    parser.add_argument(
        "--run-name",
        required=True,
        help="A unique name to distinguish this training run from "
        "others (e.g. a timestamp)",
    )
    parser.add_argument(
        "--data-path",
        required=True,
        help="A path to a directory that contains tweet data to train on. "
        "See the accompanying bash script for the data format. If this "
        "is an s3 path, the data will be downloaded to a temporary directory "
        "before training",
    )

    # Optional arguments with reasonable defaults
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--save-steps", type=int, default=1000)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--output-dir", type=str, default="checkpoints")
    args = parser.parse_args()

    main(args)
