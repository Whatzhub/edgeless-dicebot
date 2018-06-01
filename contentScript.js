console.log(1, 'content script loaded')

var stopBot = false
var runTimes = 0
var diceRollObj = {
    results: '', // 'win' or 'lose'
    winStreak: 0, // 1, 2 ..
    lossStreak: 0, // 1, 2 ..
    totalBets: 0,
    profit: 0,
    bank: 0
}
var dataObj = {
    initialWager: 0,
    winProb: 0,
    stopBank: 0,
    steps: 0,
    resetSteps: 0,
    resetMultiplier: 0
}

// Listeners to content script push messages
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.msg == 'stop') {
        stopBot = true
    }
});

function getBalance() {
    var text = $('a.nav-balance').find('div').text()
    var amt = +text.split(' ')[0]
    return amt
}

function betSystem(dataObj, currentWager, currentStep) {
    // check if stop bot
    if (stopBot) return console.log('Dice bot stopped.')

    // Cache local data
    var initialWager = dataObj.initialWager
    var winProb = dataObj.winProb
    var stopBank = dataObj.stopBank
    var steps = dataObj.steps
    var resetSteps = dataObj.resetSteps
    var resetMultiplier = dataObj.resetMultiplier

    // Cache local state
    var currentWager = currentWager
    var currentStep = currentStep

    // Set wager, win prob to Game UI
    console.log(50, currentWager, winProb)
    $('input.amount-to-bet-input').val(currentWager)
    document.getElementsByClassName("amount-to-bet-input")[0].dispatchEvent(new Event("change"));
    $('input.win-probability-value').val(winProb)
    document.getElementsByClassName("win-probability-value")[0].dispatchEvent(new Event("change"));

    // Roll Dice with current wager
    $('div.manual-betting-tab').find('button.roll-button').trigger('click');

    // After 3 secs, read & get roll results from Game UI
    Helpers.sleep(3000).then(_ => {
        // Log out game state
        runTimes++
        console.log('Dice Bot ran ' + runTimes + ' times.')

        // Determine win/loss
        var newBalance = getBalance()
        var profit = newBalance - diceRollObj.bank
        var win = (profit > 0) ? true : false
        // console.log(67, profit, win)

        // Determine game state
        var wagerCheck = currentWager < newBalance
        var stepCheck = currentStep < steps
        var stopBankCheck = newBalance < stopBank
        var resetStepsCheck = currentStep < resetSteps
        var playOn = (wagerCheck && stepCheck && stopBankCheck) ? true : false
        // console.log(68, playOn)

        // Update & broadcast results back to Popup View
        diceRollObj.totalBets++
        diceRollObj.bank = newBalance

        // Scenario 1 - Win, < stopBank
        if (win && playOn) {
            diceRollObj.results = 'win'
            diceRollObj.winStreak++
            diceRollObj.profit += profit

            // Update popup UI
            Helpers.updateMessage(diceRollObj)

            // Reset loss streak
            diceRollObj.lossStreak = 0

            // Update next roll data
            currentWager = initialWager
            currentStep = 1
            return betSystem(dataObj, currentWager, currentStep)
        }

        // Scenario 2 - Win, >= stopBank
        if (win && !stopBankCheck) {
            diceRollObj.results = 'win'
            diceRollObj.winStreak++
            diceRollObj.profit += profit

            // Reset loss streak
            diceRollObj.lossStreak = 0

            // End & celebrate your profit!
            console.log('Congrats, you made it!')
            return Helpers.endMessage(diceRollObj)
        }


        // Scenario 3a - Loss & Continue with same wager
        if (!win && resetStepsCheck) {
            diceRollObj.results = 'lose'
            diceRollObj.lossStreak++
            diceRollObj.profit += profit

            // Update popup UI
            Helpers.updateMessage(diceRollObj)

            // Reset win streak
            diceRollObj.winStreak = 0

            // Increment current steps
            currentStep++
            
            return betSystem(dataObj, currentWager, currentStep)
        }

        // Scenario 3b - Loss & Start new resetStep wager
        if (!win && !resetStepsCheck) {
            diceRollObj.results = 'lose'
            diceRollObj.lossStreak++
            diceRollObj.profit += profit

            // Update popup UI
            Helpers.updateMessage(diceRollObj)

            // Reset win streak
            diceRollObj.winStreak = 0

            // Set wager to new multipler level & reset step
            currentWager *= resetMultiplier
            currentStep = 1

            return betSystem(dataObj, currentWager, currentStep)
        }

        // Scenario 4 - Loss, > steps
        if (!win && !playOn) {
            console.log('Sorry, you are busted!')
            return Helpers.endMessage(diceRollObj)
        }
    })
    
}

// Retrieve popup field data
chrome.storage.sync.get('inputObj', function (data) {
    // Reset globals
    stopBot = false
    runTimes = 0

    // Set data object
    // console.log(89, data.inputObj)
    dataObj.initialWager = +data.inputObj.initialWager
    dataObj.winProb = +data.inputObj.winProb
    dataObj.stopBank = data.inputObj.stopBank
    dataObj.steps = data.inputObj.steps
    dataObj.resetSteps = data.inputObj.resetSteps
    dataObj.resetMultiplier = data.inputObj.resetMultiplier
    var wager = dataObj.initialWager
    var step = 1

    // Read initial balance and broadcast it back
    diceRollObj.bank = getBalance()
    Helpers.initMessage(diceRollObj)

    // Init Bet System
    betSystem(dataObj, wager, step)
});
