'use strict'
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({  region: 'ap-northeast-2'});
const tableName = 'ECCU_TEST_DYNAMO'

function random_config_key() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < 3; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}

async function make_config_key() {
    const check_license_params = {
        TableName: tableName
    }
    
    const dynamo_all_data = await documentClient.scan(check_license_params).promise()
    console.log("dynamo_response: ", dynamo_all_data.Items)
    let config_key = random_config_key();
    while(1)
    {
        let config_check_result = true
        for(const data of dynamo_all_data.Items) {
            // console.log(data["configuration_key"])
            if (data["configuration_key"] === config_key) {
                console.log("Exist same config")
                config_check_result = false
            }
        } 
        
        if (config_check_result) {
            break;
        } else {
            config_key = random_config_key()
        }
    }
    console.log("config_key: ", config_key)
    return config_key
}

exports.handler = async (event, context) => {
    
    
    let check_license_params = {
        TableName: tableName,
        Key: {
            license_key: event["license_key"]
        }
    }
    // 1. check license_key & make config code
    const dynamo_response = await documentClient.get(check_license_params).promise();
    console.log("dynamo_response: ", dynamo_response)
    let config_key = null
    let config_version = null
    
    if (Object.keys(dynamo_response).length === 0) {
        config_key = await make_config_key()
        config_version = "001"
    } else {
        config_key = dynamo_response["Item"]["configuration_key"]
        config_version = dynamo_response["Item"]["configuration_version"]
    }
    
    console.log(`config code: ${config_key}${config_version}`)
    
    // 2. DynamoDB Update
    
    // 3. Save at S3

		// 4. response to api gateway
    const response = {
        statusCode: 200,
        // body: JSON.stringify('Hello from Lambda!'),
        body: "good"
    };
        
    return response;
}