# Twitter Turing Test

A game where you need to guess whether a tweet comes from a human, or from a
neural network language model trained on a category of tweets.

[![Deployed on Model Zoo](https://modelzoo-public.s3-us-west-2.amazonaws.com/model-zoo-badge-white-github.png)](https://app.modelzoo.dev/models/gpt2-twitter-vc)

## [Live Demo](https://twitterturingtest.modelzoo.dev)

## Overview

This project uses the following open source projects for developing our  models:

* [twint](https://github.com/twintproject/twint) for scraping twitter data from a set of usernames. For some larger datasets, [scrapoxy](https://scrapoxy.readthedocs.io/en/master/quick_start/index.html) is used as a proxy pool for avoiding Twitter's IP blacklist.

* [Hugging Face Transformers](https://huggingface.co/) for fine-tuning the [Open AI GPT-2](https://openai.com/blog/better-language-models/) model on additional data.

Models are deployed to [Model Zoo](https://modelzoo.dev/) for a realtime HTTP endpoint.

The frontend React application is a wrapper around a dataset of static tweets and the Model Zoo HTTP endpoints. See [frontend documentation](./frontend/README.md) for more details.

## How to train and deploy your own language model

#### Preparing the dataset

The script `download-tweets.sh` contains our methodology for scraping a twitter dataset with [twint](https://github.com/twintproject/twint). The script accepts a single argument `$name`, and searches for a file `sources/$name.txt` which should specify a list of twitter handles to scrape from. The scraping script applies some crude heuristics to attempt to filter out tweets that (1) are replies to other tweets and (2) that have links in them. These heuristics aren't perfect, but I found they worked good enough.

In preparing several datasets with [twint](https://github.com/twintproject/twint), I found that Twitter was often blacklisting our IP a few minutes into the scraping process. To get around this, I used [scrapoxy on EC2](https://scrapoxy.readthedocs.io/en/master/standard/providers/awsec2/index.html) to scrape from five different EC2 proxy instances at once.

Several datasets have been prepared and released publically on AWS that you are free to use:

| Dataset | Sources File | AWS S3 URL |
| ------------- |:-------------:| -----:|
| Venture Capital | https://github.com/model-zoo/twitter-turing-test/blob/master/sources/vc.txt | `s3://modelzoo-datasets/text-generation/vc` |
| Republicans | https://github.com/model-zoo/twitter-turing-test/blob/master/sources/republicans.txt | `s3://modelzoo-datasets/text-generation/republicans` |
| Democrats | https://github.com/model-zoo/twitter-turing-test/blob/master/sources/democrats.txt | `s3://modelzoo-datasets/text-generation/democrats` |
| COVID-19 | https://github.com/model-zoo/twitter-turing-test/blob/master/sources/covid19.txt | `s3://modelzoo-datasets/text-generation/covid19` |

Thank you to [minimaxir/download-tweets-ai-textgen](https://github.com/minimaxir/download-tweets-ai-text-gen) for supplying a list of republican and democrat twitter handles.

#### Training the model

The script `train.py` includes code to load pretrained weights and fine-tune the model, largely adapted from the [Hugging Face Language Modeling example](https://github.com/huggingface/transformers/tree/master/examples/language-modeling). Each model was trained on a single K80 GPU. All of the models were trained for
a single epoch except for COVID-19, which was a slightly smaller dataset and
trained for two epochs. Model training took somewhere between 6 - 16 hours for each model.

The training process could be improved further with hyperparameter optimization
and additional experimentation. This is left as an exercise to the reader :)

#### Deploying the model

The model is automatically deployed after training using the [Model Zoo](https://modelzoo.dev/) `transformers` support and a few lines of code:

```
textgen = pipeline("text-generation", model=model, tokenizer=tokenizer)
modelzoo.transformers.deploy(
    textgen,
    model_name="..."
    resources_config=modelzoo.ResourcesConfig(memory_mb=2048, cpu_units=1024),
    wait_until_healthy=False,
)
```

Please ensure you run `$ modelzoo auth` to create or login to a Model Zoo account in your training environment. Alternatively, you can set the environment variable `MODELZOO_API_KEY` accordingly.

See [`modelzoo.transformers.deploy`](https://docs.modelzoo.dev/reference/modelzoo.transformers.html#modelzoo.transformers.deploy) for more details.
