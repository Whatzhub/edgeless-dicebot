// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

let runBot = document.getElementById('runBot');
let stopBot = document.getElementById('stopBot');
let isError = document.getElementById('is-error');
let inputObj = {
  initialWager: 0,
  winProb: 0,
  stopBank: 0,
  steps: 0,
  resetSteps: 0,
  resetMultiplier: 0
}
let viewObj = {
  winStreak: 0,
  lossStreak: 0,
  totalBets: 0,
  profit: 0,
  bank: 0
}

// Listeners to content script push messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  // console.log(28, request, sender)

  if (request.msg == 'init') {
    let data = request.data

    // Update Popup UI View
    viewObj.winStreak = data.winStreak
    viewObj.lossStreak = data.lossStreak
    viewObj.totalBets = data.totalBets
    viewObj.profit = data.profit
    viewObj.bank = data.bank
    setFields(viewObj)
  }


  if (request.msg == 'update') {
    let data = request.data

    // Update Popup UI View
    viewObj.winStreak = data.winStreak
    viewObj.lossStreak = data.lossStreak
    viewObj.totalBets = data.totalBets
    viewObj.profit = data.profit
    viewObj.bank = data.bank
    setFields(viewObj)

    // Update Charts
    bankrollChartConfig.data.labels.push(bankrollChartConfig.data.labels.length)
    bankrollChartConfig.data.datasets[0].data.push(data.bank)
    bankRollChart.update();
    if (data.winStreak > 0 && data.lossStreak > 0) {
      lossesChartConfig.data.datasets[0].data[data.lossStreak]++
      lossesChart.update();
    }
  }

  if (request.msg == 'end') {
    // disable 'stopBot' button
    runBot.disabled = false;
    stopBot.disabled = true;
    console.log('dicebot ended!')
  }
});

function validateFields(fieldObj) {
  for (let i in fieldObj) {
    if (fieldObj[i] == null || fieldObj[i] == '') return false
  }
  return true
}

function getFields() {
  inputObj.initialWager = document.getElementById('initialWager').value
  inputObj.winProb = document.getElementById('winProb').value
  inputObj.stopBank = document.getElementById('stopBank').value
  inputObj.steps = document.getElementById('steps').value
  inputObj.resetSteps = document.getElementById('resetSteps').value
  inputObj.resetMultiplier = document.getElementById('resetMultiplier').value
}

function setFields(viewObj) {
  document.getElementById('winStreak').value = viewObj.winStreak
  document.getElementById('lossStreak').value = viewObj.lossStreak
  document.getElementById('totalBets').value = viewObj.totalBets
  document.getElementById('profit').value = viewObj.profit
  document.getElementById('bank').value = viewObj.bank
}

stopBot.onclick = function (el) {
  // Send stop message to content script
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, { "msg": "stop" });
  });

  // disable 'stopBot' button
  runBot.disabled = false;
  stopBot.disabled = true;
}

runBot.onclick = function (el) {
  // Get input fields
  getFields()

  // Perform input validation
  let validate = validateFields(inputObj)
  if (!validate) return isError.removeAttribute('hidden')
  isError.setAttribute('hidden', '')

  // Init Charts
  bankrollChartConfig.data.labels.push(bankrollChartConfig.data.labels.length)
  lossesChartConfig.data.labels = Array.from(Array(+inputObj.steps + 1).keys())
  lossesChartConfig.data.datasets[0].data = Array.from(Array(+inputObj.steps + 1).fill(0))
  lossesChart.update();

  // disable 'runBot' button
  runBot.disabled = true;
  stopBot.disabled = false;

  chrome.storage.sync.set({ inputObj: inputObj }, function () {
    console.log("Input Fields saved.");

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // console.log(114, tabs)
      chrome.tabs.executeScript(
        tabs[0].id,
        { file: 'contentScript.js' });
    });
  });
};

let bankrollChartConfig = {
  type: 'line',
  data: {
    labels: [0],
    datasets: [{
      label: "Bankroll",
      backgroundColor: 'rgb(86, 66, 84)',
      borderColor: 'rgb(86, 66, 84)',
      data: [0],
      radius: 0,
      borderWidth: 1,
      fill: false,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: false,
      text: 'Bankroll Growth Chart'
    },
    tooltips: {
      mode: 'index',
      intersect: false,
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      xAxes: [{
        display: true,
        scaleLabel: {
          display: true,
          labelString: 'no. of bets',
          padding: 0
        }
      }],
      yAxes: [{
        display: true,
        ticks: {
          suggestedMin: 0,
          stepSize: 200
        },
        type: 'linear',
        scaleLabel: {
          display: true,
          labelString: 'Bankroll (EDG)'
        }
      }]
    }
  }
};

let lossesChartConfig = {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: "Losses Distribution",
      backgroundColor: 'rgb(234, 160, 97)',
      borderColor: 'rgb(234, 160, 97)',
      data: [0],
      fill: true,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    title: {
      display: false,
      text: 'Losses Distribution Bar Chart'
    },
    tooltips: {
      mode: 'index',
      intersect: false,
    },
    hover: {
      mode: 'nearest',
      intersect: true
    },
    scales: {
      xAxes: [{
        display: true,
        ticks: {
          min: 1,
          suggestedMax: 100
        },
        scaleLabel: {
          display: true,
          labelString: 'no. of loss streak',
          padding: 0
        }
      }],
      yAxes: [{
        display: true,
        ticks: {
          suggestedMin: 0,
          stepSize: 1
        },
        type: 'linear',
        scaleLabel: {
          display: true,
          fontColor: '#000',
          labelString: 'Frequency (Times)'
        }
      }]
    }
  }
};

let ctx1 = document.getElementById("canvas1").getContext("2d");
let ctx2 = document.getElementById("canvas2").getContext("2d");
Chart.defaults.global.defaultFontColor = 'black';
let bankRollChart = new Chart(ctx1, bankrollChartConfig);
let lossesChart = new Chart(ctx2, lossesChartConfig);
