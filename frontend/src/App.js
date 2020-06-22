import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';

import Alert from '@material-ui/lab/Alert';
import Box from '@material-ui/core/Box';
import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';

import RotateLeftIcon from '@material-ui/icons/RotateLeft';
import TwitterIcon from '@material-ui/icons/Twitter';

import './App.css';

const getRandomInt = max => {
  return Math.floor(Math.random() * max);
};

const datasetToNumPartitions = {
  vc: 489,
  democrats: 482
};

const datasetToEndpoint = {
  vc: 'https://api.modelzoo.dev/v1/models/gpt2-twitter-vc/predict',
  democrats: 'https://api.modelzoo.dev/v1/models/gpt2-twitter-democrats/predict'
};

const datasetToLink = {
  vc: 'https://app.modelzoo.dev/models/gpt2-twitter-vc',
  democrats: 'https://app.modelzoo.dev/models/gpt2-twitter-democrats'
};

const datasetToLabel = {
  vc: 'Venture Capital',
  democrats: 'Democrat',
  republicans: 'Republican',
  covid19: 'COVID-19'
};

const shareTweet = tweet => {
  // TODO: Add domain.
  const tweetTemplate = `Can you guess whether this tweet is written by a human or a neural network?\n\n "${tweet.body}" \n\n TODO: Add domain`;
  const tweetTemplateEncoded = encodeURIComponent(tweetTemplate);
  window.open(
    `https://twitter.com/intent/tweet?text=${tweetTemplateEncoded}`,
    'Tweet',
    'width=600,height=400'
  );

  return;
};

const loadNetworkTweet = (dataset, setTruth, setTweet, cancelToken) => {
  axios
    .post(
      datasetToEndpoint[dataset],
      {},
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
      // Sometimes the model might return an empty response. If this happens,
      // retry.
      if (!response.data.output[0].generated_text) {
        loadNetworkTweet(dataset, setTruth, setTweet, cancelToken);
        return;
      }

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
    .catch(error => {});
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
  if (props.revealed && props.handle === '@_modelzoo_') {
    return <img src="./images/robot.png" alt="robot" />;
  } else if (props.revealed) {
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

  const dataset = props.dataset;

  useEffect(() => {
    setTweet(null);
    setGuess(null);

    if (Math.random() < 0.5) {
      const cancelToken = axios.CancelToken.source();
      loadNetworkTweet(dataset, setTruth, setTweet, cancelToken);
      return () => {
        cancelToken.cancel();
      };
    } else {
      const timeout = loadHumanTweet(dataset, setTruth, setTweet);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [setTruth, setTweet, dataset]);

  const reset = () => {
    setTweet(null);
    setGuess(null);

    if (Math.random() < 0.5) {
      loadNetworkTweet(dataset, setTruth, setTweet);
    } else {
      loadHumanTweet(dataset, setTruth, setTweet);
    }
  };

  if (tweet === null) {
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
            variant="contained"
            onClick={() => setGuess('network')}
            disabled={guess != null}
            style={{
              height: '100px'
            }}
            fullWidth
            startIcon={null}>
            Neural Network
          </Button>
        </Grid>
        <Grid item xs sm md lg>
          <Button
            variant="contained"
            fullWidth
            onClick={() => setGuess('human')}
            disabled={guess != null}
            style={{
              height: '100px'
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

  const button = buttonDataset => {
    const isChosen = dataset === buttonDataset;
    return (
      <Button
        fullWidth
        variant={isChosen ? 'contained' : 'outlined'}
        disabled={isChosen}
        onClick={() => {
          setDataset(buttonDataset);
        }}>
        {datasetToLabel[buttonDataset]}
      </Button>
    );
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
            />
          </a>
          <Box my={1} />
          <a
            style={{ display: 'block' }}
            href="https://twitter.com/share?ref_src=twsrc%5Etfw"
            className="twitter-share-button"
            data-text="Twitter Turing Test by @_modelzoo_"
            data-show-count="false">
            Tweet
          </a>
        </Box>
        <Box my={5} />
        <Typography variant="h4" display="inline">
          <strong>Twitter Turing Test</strong>
        </Typography>
        <Box my={2} />
        <Typography variant="h5" color="primary">
          {datasetToLabel[dataset]} Edition
        </Typography>
        <Box my={2} />
        <Typography variant="body1">
          Can you tell whether this tweet is written by a human or a neural
          network?
        </Typography>
        <Game dataset={dataset} />
        <Box my={2} />
      </div>
      <div className="footer">
        <div className="footer-inner">
          <Typography variant="body1">Try another category:</Typography>
          <Grid container spacing={1} alignItems="stretch">
            <Grid item xs sm md lg>
              {button('vc')}
            </Grid>
            <Grid item xs sm md lg>
              {button('democrats')}
            </Grid>
          </Grid>
        </div>
      </div>
    </>
  );
};

export default App;
