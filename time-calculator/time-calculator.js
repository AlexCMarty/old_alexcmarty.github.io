// Explanation of fullTimeRegex (to preserve sanity)
/*
# String is broken into groups: [time1][meridian1][operator][time2][meridian2]
( # Start of number group: time1
      \d\d?:\d\d? # HH:MM, might have one H and/or one M. 4:30, 12:15, 11:4, etc.
      | \d\d? | \d\d?: # Just an hour, might have colon 4:, 12:, etc.
                      # I did not use (:)? so fullTimeRegex.match didn't capture an extra group
      | :\d\d? # Just a minute, preceded by colon. :20, :59, etc.
  )
  (am|pm)? # Group: meridian2. Might have am/pm, might not
  (\+|\-) # Group: Operator. One or the other
  (... copy paste the same big group above, time1, since they are formatted the same.)
  (am|pm)? # Group: meridian2. Again, might have am/pm, might not
  # This becomes the confusing string below
*/

/*

let timeStringConstructor = {
    timeString: undefined,
    cleanedTimeString: undefined,
    expressionData: undefined,
    dateObjects: undefined,
    init: function (this.timeString) {
        firstly, save this file and make a new one to compare results
        ... the same stuff as calculateTimeExpression
        accesses the above variables with "this" keyword
        make sure to copy the other functions into here
    },
    
}

*/
const fullTimeRegex = /^(\d\d?:\d\d?|\d\d?|\d\d?:|:\d\d?)(am|pm)?(\+|\-)(\d\d?:\d\d?|\d\d?|\d\d?:|:\d\d?)(am|pm)?$/;

var byId = function (id) { return document.getElementById(id); };

/* BEGIN TIME CALCULATION FUNCTIONS */

function calculateTimeExpression(timeString) {
    // Return new Date() | string
    // Returns new Date() object, false if could not parse, or string if a value is out of bounds (like 2:99pm)
    /*
    Step 1: Clean input
    Step 2: Extract components based on the groups in fullTimeRegex: 
        [time1][meridian1][operator][time2][meridian2]
        Functions stops and returns error message as string
    Step 3: Parse each part into two Date objects
    Step 4: Check for logical errors in the input that regex can't catch
    Step 5: Calculate with the Date objects
    Step 6: Format it
    */

    // 1. Clean
    timeString = timeString.replace(/ /g, "").toLowerCase();

    // 2. Extract components
    // Split

    let dataArray = timeString.match(fullTimeRegex);

    if (dataArray === null) {
        return "Invalid input";
    }

    // Simple parsed data. Strings
    let expressionData = {
        time1: dataArray[1],
        meridian1: dataArray[2],
        operator: dataArray[3],
        time2: dataArray[4],
        meridian2: dataArray[5]
    };

    // Step 3. Turn the parsed strings into proper Date Objects
    let dateObjects = convertStringsIntoDateObjects(expressionData);
    if (typeof dateObjects === "string"){
        return dateObjects; // Return error message
    }

    // Step 4: Mutate dateObjects to check for logical errors in the input 
    // Also add time to the hours if "pm" is present
    
    dateObjects = checkForErrorsAndAddTime(dateObjects, expressionData);
    if (typeof dateObjects === "string"){
        return dateObjects; // Return error message
    }

    // Step 5: Do the math with the objects
    // Also Step 6: Format the output to look good

    return calculateAndFormatDateObjects(dateObjects, expressionData);    
}

function convertStringsIntoDateObjects(expressionData) {
    let dateObjects = {
        time1: new Date(0),
        time2: new Date(0)
    };

    // Step 3. Go through both time1 and time2. Turn them into Date objects
    let currentTimeString;
    let digits;

    for (i of [1, 2]) {
        currentTimeString = expressionData[`time${i}`]
        let newDateObject = new Date(0); // Starting from the epoch, Jan 1 1970

        switch (currentTimeString.indexOf(":")) {
            case 0: // :MM
                digits = Number(
                    currentTimeString.slice(1, currentTimeString.length)
                );

                if (digits < 0 || digits > 59) {
                    return `ValueError in ${currentTimeString}, minute of out of bounds`;
                }

                newDateObject.setUTCMinutes(digits);
                break;

            case -1: // HH
                digits = Number(currentTimeString);

                if (digits < 0 || digits > 24) {
                    return `ValueError in ${currentTimeString}, hour of out of bounds`;
                }

                newDateObject.setUTCHours(digits);
                break;

            default: // HH: AND HH:MM

                let [hours, minutes] = currentTimeString.split(":");
                // Notice that "3:".split(":") returns ["3", ""]
                // Number("") === 0, which is good
                // Therefore, this also handles the condition of no mminute being present.

                if (hours < 0 || hours > 24) {
                    return `ValueError in ${currentTimeString}, hour of out of bounds`;
                }

                if (minutes < 0 || minutes > 59) {
                    return `ValueError in ${currentTimeString}, minute of out of bounds`;
                }

                newDateObject.setUTCHours(Number(hours));
                newDateObject.setUTCMinutes(Number(minutes));
                break;
        }

        dateObjects[`time${i}`] = newDateObject;
    }

    return dateObjects;
}

function checkForErrorsAndAddTime(dateObjects, expressionData){

    // Bind each time to its meridian and apply logic
    let dateMeridianPairs = [
        {
            dateObject: dateObjects.time1,
            meridian: expressionData.meridian1
        },
        {
            dateObject: dateObjects.time2,
            meridian: expressionData.meridian2
        }
    ];

    let hours;
    let minutes;
    for (pair of dateMeridianPairs) {
        hours = pair.dateObject.getUTCHours();
        minutes = pair.dateObject.getUTCMinutes();

        if (expressionData.operator == "+" && expressionData.meridian1 && expressionData.meridian2) {
            return ("ValueError: Meridian cannot exist in both time components for addition. Both can't be times; one must be a duration")

        } else if (hours === 0 && minutes === 0 && pair.meridian === "pm") { // TODO extractv23
            return ("00:00pm does not make sense")

        } else if (hours > 12 && pair.meridian) {
            return ("When entering 24 hour time, am/pm cannot be used")

        } else if (hours < 12 && pair.meridian === "pm") {
            pair.dateObject.setUTCHours(hours + 12);

        } else if (hours === 12 && pair.meridian === "am") {
            pair.dateObject.setUTCHours(0); // Exception, since 12am is hours=0
        }
    }

    return dateObjects;
}

function calculateAndFormatDateObjects(dateObjects, expressionData) {
    let output;
    switch (expressionData.operator) {
        case "+":
            output = new Date(dateObjects.time1.getTime() + dateObjects.time2.getTime());

            let additionalDayString = "";
            let utcDate = output.getUTCDate();
            if (utcDate > 1) {
                additionalDayString = `, ${utcDate - 1} day${utcDate !== 1 ? "" : "s"} in the future`;
            }

            let timeOptions = {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: "UTC"
            };

            output = output.toLocaleTimeString("en-US", timeOptions);
            output += additionalDayString;
            break;
        case "-":
            output = new Date(dateObjects.time2.getTime() - dateObjects.time1.getTime());

            // Ex: `1 day, 2 hours, 14 minutes`
            let hours = output.getUTCHours();
            let minutes = output.getUTCMinutes();
            output = `${hours} hour${hours !== 1 ? "s" : ""} and ${minutes} minute${minutes !== 1 ? "s" : ""}`;
            break;
    }
    return (output);
}

/* END TIME CALCULATION FUNCTIONS */

function updateOutput() {
    const inputString = document.getElementById("inputBox");
    let outputBox = document.getElementById("outputBox")

    let output = calculateTimeExpression(inputString.value);
    outputBox.innerHTML = output;
}

function setup() {
    byId('inputBox').value = '3pm+5';
    byId('submitButton').click();

    byId("inputBox").addEventListener(
        "keydown",
        function (keypress) {
            if (keypress.key === "Enter") {
                updateOutput()
            }
        }
    );
}

let unitTests = [
    "2pm+3:30", // 0
    "1:30pm+6:45am", // 1 
    "3:pm+6:45am", // 2
    "1+:45am", // 3
    "12AM-12PM", // 4
    "16:30 + 17", // 5
    "12pm - 3pm", // 6
    "4:30am + 7:15AM", // 7
    "6 - 7:30", // 8
    "0:00 + 00:pm", // 9
    ":45 - :15pm", // 10
    "16pm + 22am", // 11
];

let output = [];
for (let i = 0; i < unitTests.length; i++) {
    const test = unitTests[i];
    output.push([`i=${i}`, test, calculateTimeExpression(test)]);
}

console.log(output);

console.log("\n\nTODO: Refactor bounds checking if-statements for minute and hour bounds")
console.log("TODO: Check for various edge cases, such as 24+24");
console.log("TODO: Refactor by breaking into functions, OR by making an object. Whichever is the most logical. Probs the former");
console.log("TODO: Extract function usePlural for plural checking in text generation");
console.log("TODO: Extract function to convert to locale string to simplify this conditional check. Ctrl+F for 'extractv23'")