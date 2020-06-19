import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import './App.css';

const getRandomInt = max => {
  return Math.floor(Math.random() * max);
};

const Avatar = props => {
  if (props.revealed && props.handle === '@robot') {
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

  const loadNetworkTweet = dataset => {
    axios
      .post(
        'https://api.modelzoo.dev/v1/models/gpt2-twitter-vc/predict',
        {},
        {
          headers: {
            // The Model Zoo Public Demo API Key. This key can only be used to
            // access demo models.
            'x-api-key': 'Wr5fOM2kbqarVwMu8j68T209sQLNDESD33QKHQ03',
            'Content-Type': 'application/json'
          }
        }
      )
      .then(response => {
        setTruth('network');
        setTweet({
          handle: '@robot',
          author: 'Neural Network',
          body: response.data.output[0].generated_text,
          likes: 0,
          datetime: moment().format(),
          link: '#'
        });
      })
      .catch(error => {
        console.log(error);
      });
  };

  const loadHumanTweet = dataset => {
    // To prevent loading the entire dataset of static tweets into browser
    // memory, we partition each dataset into a fixed number of files
    // (hardcoded here) with 100 lines each. We first sample a random file,
    // then sample a random line within that file.
    //
    // Generating a tweet from the language model will have some latency,
    // while this process is near instantaneous. Therefore, we also fake some
    // latency here to prevent users from using that signal.

    const partitions = {
      vc: 489
    };

    const randLatencyMilliseconds = 500 + Math.random() * 1500; // 500ms ~ 2000ms
    const randPartition = getRandomInt(partitions[dataset]);
    const partitionName = randPartition.toString().padStart(3, '0');
    const partitionFile = './data/' + dataset + '/' + partitionName + '.txt';

    setTimeout(() => {
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

  const loadRandomTweet = () => {
    const type = 'vc';

    if (Math.random() < 0.5) {
      loadNetworkTweet(type);
    } else {
      loadHumanTweet(type);
    }
  };

  useEffect(() => {
    loadRandomTweet();
  }, []);

  const reset = () => {
    setTweet(null);
    setGuess(null);
    loadRandomTweet();
  };

  if (tweet === null) {
    return <p>Loading...</p>;
  }

  const isCorrect = guess === truth;

  return (
    <>
      <div
        className="tweet-container"
        style={guess ? { transform: 'rotateY(180deg)' } : null}>
        <Tweet
          tweet={{ ...tweet, revealed: false }}
          style={{ position: 'absolute' }}
        />
        <Tweet
          tweet={{ ...tweet, revealed: true }}
          style={{ position: 'absolute', transform: 'rotateY(180deg)' }}
        />

        {/* Add a dummy tweet with hidden visibility so that the elements
            positioned after this match the height of the absolute elements. */}
        <Tweet
          tweet={tweet}
          style={{ position: 'relative', visibility: 'hidden' }}
        />
      </div>

      <div className="answer-container">
        <button
          className="answer-button"
          onClick={() => setGuess('network')}
          disabled={guess != null}>
          <div style={{ fontSize: '50px' }}>
            <span role="img" aria-label="robot">
              🤖
            </span>
          </div>
          <div>Neural Network</div>
        </button>
        <button
          className="answer-button"
          onClick={() => setGuess('human')}
          disabled={guess != null}>
          <div style={{ fontSize: '50px' }}>
            <span role="img" aria-label="human brain">
              🧠
            </span>
          </div>
          <div>Human</div>
        </button>
      </div>

      {guess != null && (
        <div className="results-container">
          <h1 style={{ color: isCorrect ? 'green' : 'red' }}>
            {isCorrect ? 'Correct' : 'Wrong'}
          </h1>
          <button
            className="try-again"
            style={{ height: '50px' }}
            onClick={reset}>
            Try Again
          </button>
        </div>
      )}
    </>
  );
};

const App = () => {
  return (
    <div className="wrapper">
      <h1>Twitter Turing Test</h1>
      <h4>Venture Capital Edition</h4>
      <p>
        Can you tell whether this tweet is written by a human or a neural
        network?
      </p>
      <Game />
    </div>
  );
};

export default App;
