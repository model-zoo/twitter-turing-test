import React, {useEffect, useState} from 'react';
import axios from 'axios';
import moment from 'moment';
import './App.css';

const Avatar = props => {
  if (props.revealed) {
    return <img src={`http://twivatar.glitch.me/${props.handle}`} />
  } else {
    return <img src="./images/question.png" style={{border: "1px black"}}/>
  }
}


const Tweet = props => {
  const {handle, author, body, likes, datetime, link, revealed} = props.tweet;
  const style = props.style || {};

  return (
    <div className="tweet-outer" style={style}>
      <div className="tweet">
        <a href={revealed ? link : "#"}>
          <div className="tweet-header">
            <div className="tweet-avatar">
              <Avatar {...props.tweet} />
            </div>
            <div className="tweet-screenname-container">
              <div className="tweet-screenname-name">{revealed ? author : "???"} <span className="tweet-verified-screenname"></span></div>
              <div className="tweet-screenname-account">{revealed ? handle : "@???" }</div>
            </div>
            <div className="tweet-brand">
              <div className="tweet-brand-pic" />
            </div>
          </div>
          <div className="tweet-body">
            <p>{body}</p>
            <div className="tweet-info">
              <div className="tweet-heart">
                <div className="tweet-heart-icon"></div>
                <span className="tweet-heart-stat">{revealed ? likes : "???"}</span>
              </div>
              <time className="tweet-time">{revealed ? moment(datetime).format("MMMM Do YYYY, h:mm") : "???"}</time>
              <div className="tweet-info-icon" />
            </div>
          </div>
        </a>
      </div>
    </div>
  )
}


const Game = props => {
  let [tweet, setTweet] = useState(null);
  let [truth, setTruth] = useState(null);
  let [guess, setGuess] = useState(null);
  let [guessMessage, setGuessMessage] = useState(null);

  const loadNewTweet = () => {
    axios.post("https://api.modelzoo.dev/v1/models/gpt2-twitter-vc/predict", {}, {
      headers: {
        // The Model Zoo Public Demo API Key. This key can only be used to
        // access demo models.
        'x-api-key': 'Wr5fOM2kbqarVwMu8j68T209sQLNDESD33QKHQ03',
        'Content-Type': 'application/json'
      }
    }).then(response => {
      setTweet({
        handle: "@paulg",
        author: "Paul Graham",
        body: response.data.output[0].generated_text,
        likes: 240,
        datetime: "2020-06-17T19:33:46+0000",
        link: "https://twitter.com/paulg/status/1273338063079473154"
      });
      console.log(response);
    }).catch(error => {
      console.log(error);
    });
  }

  useEffect(() => {
    loadNewTweet()
  }, [])

  const evaluateGuess = () => {
    if (guess === truth) {
      setGuessMessage("Correct")
    } else {
      setGuessMessage("Wrong")
    }
  }

  const guessHuman = () => {
    setGuess("human")
    evaluateGuess()
  }

  const guessNetwork = () => {
    setGuess("network")
    evaluateGuess()
  }

  const reset = () => {
    setTweet(null);
    setGuess(null);
    setGuessMessage(null);
    loadNewTweet()
  }

  if (tweet === null) {
    return <p>Loading...</p>
  }

  return (
      <>
      <div className="tweet-container" style={guess ? {transform: "rotateY(180deg)"} : null}>
        <Tweet tweet={{...tweet, revealed: false}} style={{position: "absolute"}} />
        <Tweet tweet={{...tweet, revealed: true}} style={{position: "absolute", transform: "rotateY(180deg)" }} />

        {/* Add a dummy tweet with hidden visibility so that the elements
            positioned after this match the height of the absolute elements. */}
        <Tweet tweet={tweet} style={{position: "relative", visibility: "hidden"}} />
      </div>

      <div className="answer-container">
        <button className="answer-button" onClick={guessNetwork} disabled={guess != null}>
         <div style={{fontSize: "50px"}}>🤖</div>
         <div>Neural Network</div>
        </button>
        <button className="answer-button" onClick={guessHuman} disabled={guess != null}>
         <div style={{fontSize: "50px"}}>🧠</div>
         <div>Human</div>
        </button>
      </div>

      {guess != null &&
        <div className="results-container">
          <img src={guess === truth ? "./images/cumberbatch-winking.gif" : "./images/cumberbatch-sad.gif"} />
          <button className="try-again" style={{height: "50px"}} onClick={reset}>Try Again</button>
        </div>
      }
      </>
  );
}

const App = () => {
    return <div className="wrapper">
      <h1>Twitter Turing Test</h1>
      <h4>Venture Capital Edition</h4>
      <p>Can you tell whether this tweet is written by a human or a neural network?</p>
      <Game />
    </div>
}

export default App;
