import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import { Share } from 'react-twitter-widgets';

import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';

import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import ErrorIcon from '@material-ui/icons/Error';
import TwitterIcon from '@material-ui/icons/Twitter';

import './App.css';

const getRandomInt = max => {
  return Math.floor(Math.random() * max);
};

const datasetToNumPartitions = {
  vc: 489,
  democrats: 482,
  republicans: 571,
  covid19: 130
};

const datasetToEndpoint = {
  vc: 'https://api.modelzoo.dev/v1/models/gpt2-twitter-vc/predict',
  democrats:
    'https://api.modelzoo.dev/v1/models/gpt2-twitter-democrats/predict',
  republicans:
    'https://api.modelzoo.dev/v1/models/gpt2-twitter-republicans/predict',
  covid19: 'https://api.modelzoo.dev/v1/models/gpt2-twitter-covid19/predict'
};

const datasetToLink = {
  vc: 'https://app.modelzoo.dev/models/gpt2-twitter-vc?tab=use',
  democrats: 'https://app.modelzoo.dev/models/gpt2-twitter-democrats?tab=use',
  republicans:
    'https://app.modelzoo.dev/models/gpt2-twitter-republicans?tab=use',
  covid19: 'https://app.modelzoo.dev/models/gpt2-twitter-covid19?tab=use'
};

const datasetToSources = {
  vc:
    'https://github.com/model-zoo/twitter-turing-test/blob/master/sources/vc.txt',
  democrats:
    'https://github.com/model-zoo/twitter-turing-test/blob/master/sources/democrats.txt',
  republicans:
    'https://github.com/model-zoo/twitter-turing-test/blob/master/sources/republicans.txt',
  covid19:
    'https://github.com/model-zoo/twitter-turing-test/blob/master/sources/covid19.txt'
};

const shareTweet = tweet => {
  const tweetTemplate = `"${tweet.body}" -- ${tweet.author}\n\nhttps://twitterturingtest.modelzoo.dev`;
  const tweetTemplateEncoded = encodeURIComponent(tweetTemplate);
  window.open(
    `https://twitter.com/intent/tweet?text=${tweetTemplateEncoded}`,
    'Tweet',
    'width=600,height=400'
  );

  return;
};

const loadNetworkTweet = (
  dataset,
  setTruth,
  setTweet,
  setError,
  cancelToken
) => {
  axios
    .post(
      datasetToEndpoint[dataset],
      { min_length: 3 },
      {
        headers: {
          // The Model Zoo Public Demo API Key. This key can only be used to
          // access demo models.
          'x-api-key': 'Wr5fOM2kbqarVwMu8j68T209sQLNDESD33QKHQ03',
          'Content-Type': 'application/json'
        },
        cancelToken: cancelToken ? cancelToken.token : null
      }
    )
    .then(response => {
      setTruth('network');
      setTweet({
        handle: '@_modelzoo_',
        author: 'Neural Network',
        body: response.data.output[0].generated_text,
        likes: 0,
        datetime: moment().format(),
        link: datasetToLink[dataset]
      });
    })
    .catch(error => {
      // If Model Zoo servers are being overloaded we'll get a 429 or 503
      // status back. In this case, display to the user.
      if (
        error.response &&
        (error.response.status === 429 || error.response.status === 503)
      ) {
        setError('load');
      } else if (error.request) {
        setError('unknown');
      }
    });
};

const loadHumanTweet = (dataset, setTruth, setTweet) => {
  // To prevent loading the entire dataset of static tweets into browser
  // memory, we partition each dataset into a fixed number of files
  // (hardcoded here) with 100 lines each. We first sample a random file,
  // then sample a random line within that file.
  //
  // Generating a tweet from the language model will have some latency,
  // while this process is near instantaneous. Therefore, we also fake some
  // latency here to prevent users from using that signal.

  const randLatencyMilliseconds = 500 + Math.random() * 1500; // 500ms ~ 2000ms
  const randPartition = getRandomInt(datasetToNumPartitions[dataset]);
  const partitionName = randPartition.toString().padStart(3, '0');
  const partitionFile = './data/' + dataset + '/' + partitionName + '.txt';

  return setTimeout(() => {
    fetch(partitionFile)
      .then(r => r.text())
      .then(response => {
        const tweets = response.split('\n');
        const rawTweet = tweets[getRandomInt(tweets.length)];
        const tweet = JSON.parse(rawTweet);

        setTruth('human');
        setTweet({
          handle: tweet.username,
          author: tweet.name,
          body: tweet.tweet,
          likes: tweet.likes_count,
          datetime: moment(tweet.date + ' ' + tweet.time).format(),
          link: tweet.link
        });
      });
  }, randLatencyMilliseconds);
};

const Avatar = props => {
  if (props.revealed) {
    return (
      <img
        src={`http://twivatar.glitch.me/${props.handle}`}
        alt={props.handle}
      />
    );
  } else {
    return (
      <img
        src="./images/question.png"
        style={{ border: '1px black' }}
        alt="mystery"
      />
    );
  }
};

const Tweet = props => {
  const { handle, author, body, likes, datetime, link, revealed } = props.tweet;
  const style = props.style || {};

  return (
    <div className="tweet-outer" style={style}>
      <div className="tweet">
        <div className="tweet-header">
          <div className="tweet-avatar">
            <Avatar {...props.tweet} />
          </div>
          <a href={revealed ? link : '#'}>
            <div className="tweet-screenname-container">
              <div className="tweet-screenname-name">
                {revealed ? author : '???'}{' '}
                <span className="tweet-verified-screenname"></span>
              </div>
              <div className="tweet-screenname-account">
                {revealed ? handle : '@???'}
              </div>
            </div>
          </a>
          <div className="tweet-brand">
            <div className="tweet-brand-pic" />
          </div>
        </div>
        <a href={revealed ? link : '#'}>
          <div className="tweet-body">
            <p>{body}</p>
            <div className="tweet-info">
              <div className="tweet-heart">
                <div className="tweet-heart-icon"></div>
                <span className="tweet-heart-stat">
                  {revealed ? likes : '???'}
                </span>
              </div>
              <time className="tweet-time">
                {revealed
                  ? moment(datetime).format('MMMM Do YYYY, h:mm')
                  : '???'}
              </time>
              <div className="tweet-info-icon" />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
};

const Game = props => {
  let [tweet, setTweet] = useState(null);
  let [truth, setTruth] = useState(null);
  let [guess, setGuess] = useState(null);
  let [error, setError] = useState(null);

  const { dataset, setNumGuesses, setNumRight } = props;

  useEffect(() => {
    setTweet(null);
    setGuess(null);

    if (Math.random() < 0.5) {
      const cancelToken = axios.CancelToken.source();
      loadNetworkTweet(dataset, setTruth, setTweet, setError, cancelToken);
      return () => {
        cancelToken.cancel();
      };
    } else {
      const timeout = loadHumanTweet(dataset, setTruth, setTweet);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [setTruth, setTweet, setError, dataset]);

  const reset = () => {
    setTweet(null);
    setGuess(null);

    if (Math.random() < 0.5) {
      loadNetworkTweet(dataset, setTruth, setTweet, setError);
    } else {
      loadHumanTweet(dataset, setTruth, setTweet);
    }
  };

  if (error !== null) {
    if (error === 'load') {
      return (
        <Box style={{ textAlign: 'center' }}>
          <ErrorIcon fontSize="large" />
          <Box my={3} />
          <Typography variant="body1">
            Our servers are currently struggling to support the high load :(
            Please come try again later.
          </Typography>
          <Box my={3} />
          <Typography variant="body2" className="styleLinks">
            <a href="mailto:contact@modelzoo.dev">Hire us</a> so we can afford
            more server capacity?
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box style={{ textAlign: 'center' }}>
          <ErrorIcon fontSize="large" />
          <Typography variant="body1">
            Something went wrong :( Please come try again later.
          </Typography>
        </Box>
      );
    }
  } else if (tweet === null) {
    return (
      <Box my={2} style={{ textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  const isCorrect = guess === truth;

  const rotate = {
    transform: 'rotateY(180deg)',
    WebkitTransform: 'rotateY(180deg)',
    MozTransform: 'rotateY(180deg)'
  };

  const rotateBehind = {
    transform: 'translateZ(-1px) rotateY(180deg)',
    WebkitTransform: 'translateZ(-1px) rotateY(180deg)',
    MozTransform: 'translateZ(-1px) rotateY(180deg)'
  };

  return (
    <>
      <div className="tweet-container" style={guess ? rotate : null}>
        <Tweet
          tweet={{ ...tweet, revealed: false }}
          style={{ position: 'absolute' }}
        />
        <Tweet
          tweet={{ ...tweet, revealed: true }}
          style={{ position: 'absolute', ...rotateBehind }}
        />

        {/* Add a dummy tweet with hidden visibility so that the elements
            positioned after this match the height of the absolute elements. */}
        <Tweet
          tweet={tweet}
          style={{ position: 'relative', visibility: 'hidden' }}
        />
      </div>

      <Box my={2} />

      <Grid container spacing={2} alignItems="stretch">
        <Grid item xs sm md lg>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setNumGuesses(x => x + 1);
              if (truth === 'network') {
                setNumRight(x => x + 1);
              }
              setGuess('network');
            }}
            disabled={guess != null}
            style={{
              height: '75px'
            }}
            fullWidth
            startIcon={null}>
            Neural Network
          </Button>
        </Grid>
        <Grid item xs sm md lg>
          <Button
            color="secondary"
            variant="contained"
            fullWidth
            onClick={() => {
              setNumGuesses(x => x + 1);
              if (truth === 'human') {
                setNumRight(x => x + 1);
              }
              setGuess('human');
            }}
            disabled={guess != null}
            style={{
              height: '75px'
            }}>
            Human
          </Button>
        </Grid>
      </Grid>

      {guess != null && (
        <Grid container spacing={2} alignItems="stretch">
          <Grid item xs={12} sm={6} md={6}>
            <Alert
              variant="filled"
              severity={isCorrect ? 'success' : 'error'}
              style={{ boxSizing: 'border-box', height: '100%' }}>
              {isCorrect ? 'You got it right!' : 'You got it wrong!'}
            </Alert>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <Button
              variant="contained"
              onClick={reset}
              fullWidth
              startIcon=<RotateLeftIcon />>
              New Tweet
            </Button>
          </Grid>
          <Grid item xs={6} sm={3} md={3}>
            <Button
              variant="contained"
              onClick={() => {
                shareTweet(tweet);
              }}
              style={{
                backgroundColor: '#1b95e0',
                color: 'white',
                height: '100%'
              }}
              fullWidth
              startIcon=<TwitterIcon />>
              Share
            </Button>
          </Grid>
        </Grid>
      )}
    </>
  );
};

const App = () => {
  let [dataset, setDataset] = useState('vc');
  let [numRight, setNumRight] = useState(0);
  let [numGuesses, setNumGuesses] = useState(0);

  const scorePercent =
    numGuesses > 0 ? ((numRight / numGuesses) * 100).toFixed(2) : 0;
  const scoreStr =
    numGuesses > 0 ? `${numRight}/${numGuesses} (${scorePercent}%)` : '';

  const shareOptions = {
    size: 'large',
    text:
      'Can you guess whether a tweet is written by a human or a neural network?' +
      (numGuesses > 0 ? ` My score: ${scoreStr}` : '')
  };

  return (
    <>
      <div className="wrapper">
        <Box display="inline" style={{ float: 'right', textAlign: 'right' }}>
          <a href={datasetToLink[dataset]}>
            <img
              style={{ display: 'block' }}
              src="https://modelzoo-public.s3-us-west-2.amazonaws.com/model-zoo-badge-transparent.png"
              width="150px"
              alt="Deployed on Model Zoo"
            />
          </a>
          <Box my={1} />
          <a
            href="https://www.producthunt.com/posts/twitter-turing-test?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-twitter-turing-test"
            target="_blank"
            rel="noopener noreferrer">
            <img
              src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=210985&theme=light"
              alt="Twitter Turing Test - Is this tweet by a human or generated by a neural net? | Product Hunt Embed"
              style={{ width: '150px', height: '33px' }}
              width="150px"
              height="33px"
            />
          </a>
          <Box my={1} />
          <a
            className="github-button"
            href="https://github.com/model-zoo/twitter-turing-test"
            data-size="large"
            aria-label="Star model-zoo/twitter-turing-test on GitHub">
            Star
          </a>
          <Share
            url="https://twitterturingtest.modelzoo.dev"
            options={shareOptions}
          />
        </Box>
        <Box my={5} />
        <Typography variant="h4">
          <strong>Twitter Turing Test</strong>
        </Typography>
        <Typography variant="h5" className="styleLinks">
          by <a href="https://modelzoo.dev">Model Zoo</a>
        </Typography>
        <Box my={2} />
        <Select
          value={dataset}
          style={{
            color: '#e94f37',
            fontSize: '1.5rem',
            fontWeight: '400'
          }}
          onChange={e => {
            setDataset(e.target.value);
          }}
          display="inline">
          <MenuItem value="vc">Venture Capital</MenuItem>
          {
            // Disable some of the additional models to save costs.
            // <MenuItem value="democrats">Democrat</MenuItem>
            // <MenuItem value="republicans">Republican</MenuItem>
            // <MenuItem value="covid19">COVID-19</MenuItem>
          }
        </Select>{' '}
        <Typography variant="h5" color="primary" display="inline">
          Edition
        </Typography>
        <Box my={2} />
        <Typography variant="body1">
          Can you guess whether this tweet is written by a human or generated by
          a neural network?
        </Typography>
        <Box my={2} />
        <Typography variant="h5">
          <b>Score</b>: {scoreStr}
        </Typography>
        <Box my={2} />
        <Game
          dataset={dataset}
          setNumGuesses={setNumGuesses}
          setNumRight={setNumRight}
        />
        <Box my={2} />
        <Typography variant="body1" className="styleLinks">
          Hire the team behind this:{' '}
          <a href="mailto:contact@modelzoo.dev">contact@modelzoo.dev</a>
        </Typography>
        <Box my={2} />
        <Typography variant="body2" className="styleLinks">
          <i>
            This model is based on{' '}
            <a href="https://openai.com/blog/better-language-models/">GPT-2</a>{' '}
            and fine-tuned on{' '}
            <a href={datasetToSources[dataset]}>these twitter accounts</a>. The
            views expressed by the source tweets do not necessarily reflect our
            opinion. The views expressed by the model tweets are a parody and do
            not necessarily reflect the opinion of any one individual. The model
            tweets may reflect biases in the training set.
          </i>
        </Typography>
      </div>
    </>
  );
};

export default App;
