const fs = require('fs')
const async = require('async')
const EngageVoice = require('engagevoice-sdk-wrapper')

require('dotenv').load()

var ev = new EngageVoice.RestClient(process.env.RC_APP_CLIENT_ID, process.env.RC_APP_CLIENT_SECRET)

ev.login(process.env.RC_USERNAME, process.env.RC_PASSWORD, process.env.RC_EXTENSION_NUM, function(err, response){
    if (err)
      console.log(err)
    else{
      read_call_recording()
    }
})

function read_call_recording(){
    var endpoint = 'admin/accounts/~/json'
    var params = {
            reportType: "GLOBAL_CALL_TYPE_EXCEL",
            reportCriteria: {
                criteriaType: "GLOBAL_CALL_TYPE_CRITERIA",
                startDate: "2020-05-12T00:00:00.000-0000",
                endDate: "2020-05-13T23:59:59.999-0000",
                containGates: true,
                containCampaigns: true,
                containIvrStudios: true,
                containCloudProfiles: true,
                containTracNumbers: true,
                containAgents: true,
                includeNoAnswers: false
            }
        }
    ev.post(endpoint, params, function(err, response){
        if (err){
            console.log(err)
        }else {
            var jsonObj = JSON.parse(response)
            var callRecordingUrls = []
            var csv = "uii,source_type,ani,dnis,call_status,call_result,queue_time,call_duration,call_start,call_end"
            for (var item of jsonObj){
              if (item.recordingUrl && item.recordingUrl.length){
                csv += "\r\n" + item.uii + ","
                csv += item.sourceType + ","
                csv += item.ani + ","
                csv += item.dnis + ","
                csv += item.callStatus + ","
                csv += item.callResult + ","
                csv += item.queueTime + ","
                csv += item.callDuration + ","
                csv += item.connectedDuration + ","
                csv += item.recordingUrl + ","
                csv += item.callStartDts + ","
                csv += item.callEndDts + ","
                csv += item.connectedDts + ","
                callRecordingUrls.push(item.recordingUrl)
              }
            }
            fs.writeFile("archives/sample-data.csv" , csv, 'utf-8', function(err){
              if (err) throw err
                console.log('Achived.')
            })
            if (callRecordingUrls.length)
              downloadCallRecording(callRecordingUrls)
        }
    })
}

function downloadCallRecording(callRecordingUrls){
    async.forEachLimit(callRecordingUrls, 1, function(recordingUrl, nextRecording){
      async.waterfall([
          function readRecording(done) {
            console.log(recordingUrl)
            var urlParts = recordingUrl.split("/")
            var fileName = "recordings/" + urlParts[urlParts.length-1]
            ev.save_call_recording(recordingUrl, fileName, (err, response) => {
              if (err)
                console.log("Download file failed.")
              done ()
            })
          }
        ], function (error, success) {
            if (error) {
              console.log('Some error!');
            }
            console.log("Download next call recording...")
            nextRecording()
        });
    }, function(err){
        console.log("Download call recordings completed!");
    });
}
