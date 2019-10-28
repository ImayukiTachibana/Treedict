const express = require('express');
const app = express();
const fs = require('fs');
const csv = require('csvtojson');
const rp = require('request-promise');
const otcsv = require('objects-to-csv');
const cheerio = require('cheerio');
const timezone = require('system-timezone');

const baseURL = 'https://teamtrees.org/';

let currentCount = 5000000;
let currentDate;
let currentAverage;

app.get('/api/v1/predict', (req,res) => {
    res.send(currentDate);
});

//Create data.csv
fs.open("data.csv",'r',function(err, fd){
    if (err) {
      fs.writeFile("data.csv", '', function(err) {
          if(err) {
              console.log(err);
          }
          console.log("Created data.csv!");
      });
    } else {
      console.log("data.csv already exists exists!");
    }
  });

let collect = setInterval(async () => {
    //Get page source
    const html = await rp(baseURL);

    //Get tree count from source
    const treeCount = cheerio('div#totalTrees.counter', html).attr('data-count');

    //Get current time
    let d = new Date();
    let timestamp = ("00" + d.getHours()).slice(-2) + ":" + ("00" + d.getMinutes()).slice(-2) + ":" + ("00" + d.getSeconds()).slice(-2);
    
    //Log data
    console.log("[" + timestamp + "] " + "Tree count: " + treeCount);
    let data = [
        {
            time: d.getTime(),
            count: treeCount,
            increase: treeCount - currentCount
        }
    ];

    //Convert data to CSV and save to data.csv
    let csvdata = new otcsv(data);
    if (data[0].increase !== 0) await csvdata.toDisk('./data.csv', { append: true });

    //Convert CSV from data.csv into a json object
    let parsedData = await csv().fromFile('./data.csv');

    //Removed data older than 10 mins
    for(var set in parsedData){
        if (parsedData[set].time < Date.now() - 3600000) {
            console.log("Deleting old data pulled at " + parsedData[set].time)
            delete parsedData[set];
        } 
    }

    //Convert to js object
    var result = [];
    for(var i in parsedData) {
        result.push({
            time: parsedData[i].time,
            count: parsedData[i].count,
            increase: parsedData[i].increase
        });
    }

    //Convert js object to csv and save data
    let newdata = new otcsv(result);
    await newdata.toDisk('./data.csv');

    //Set global variable
    currentCount = result[result.length - 1].count;

    //Average the $/secs
    let total = 0;
    for(var x in parsedData) {
        total = total + new Number(parsedData[x].increase);
    }
    currentAverage = total / 3600;

    //Calculate approximate time
    let beta = new Date(Date.now() + (((20000000 - currentCount) / currentAverage) * 1000));
    console.log(beta);
    currentDate = [{
        date: {
            time: beta.getTime(),
            timezone: timezone(),
            year: beta.getFullYear(),
            month: beta.getMonth() + 1,
            day: beta.getDate(),
            hour: beta.getHours(),
            minute: beta.getMinutes(),
            seconds: beta.getSeconds(),
            milliseconds: beta.getMilliseconds()
        }
    }];
}, 10000);

const listener = app.listen(6969, function() {
    console.log('Launched app on port ' + listener.address().port);
});
