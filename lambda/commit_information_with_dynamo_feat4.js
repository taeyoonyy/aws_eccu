'use strict'
const AWS = require('aws-sdk');
const documentClient = new AWS.DynamoDB.DocumentClient({  region: 'ap-northeast-2'});
const tableName = 'ECCU_TEST_DYNAMO'
const s3bucket = new AWS.S3({params: {Bucket: 'yty-s3-test'}});

/**
 * configuration key를 생성한다
 * 영문 대문자 3글자
 * @returns {string} configuration key 
 */
function random_3_char_string() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < 3; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * 
 charactersLength));
   }
   return result;
}


/**
 * DynamoDB에 등록된 configuration을 확인하여 중복되지 않는 configuration key를 생성한다.
 * 영문 대문자 3글자
 * @returns {string} configuration key 
 */
async function make_config_key() {
    const check_license_params = {
        TableName: tableName
    }
    
    const dynamo_all_data = await documentClient.scan(check_license_params).promise()
    console.log('dynamo_response: ', dynamo_all_data.Items)
    let config_key = random_3_char_string();
    while(1)
    {
        let config_check_result = true
        for(const data of dynamo_all_data.Items) {
            // console.log(data['configuration_key'])
            if (data['configuration_key'] === config_key) {
                console.log('Exist same config')
                config_check_result = false
            }
        } 
        
        if (config_check_result) {
            break;
        } else {
            config_key = random_3_char_string()
        }
    }
    console.log('config_key: ', config_key)
    return config_key
}

/**
 * DynamoDB의 config info 업데이트
 * @param {string} license_key
 * @param {string} configuration_key
 * @param {string} configuration_version
 * @param {object} configuration_data
 * @param {string} user
 */
async function update_config_info_dynamo (config_info) {
    console.log('info:', config_info)
    const params = {
        TableName: tableName,
        Item: {
            license_key: config_info['license_key'],
            configuration_key: config_info['configuration_key'],
            configuration_version: config_info['configuration_version'],
            configuration_data: config_info['configuration_data'],
            user: config_info['user']
        }
    }
    try {
        const data = await documentClient.put(params).promise();
        console.log('upodate config:', data);
    } catch (err) {
        console.log(err);
    }
}

/**
 * configuration_version up
 * @param {string} configuration_version
 * @returns {string} 3자리 숫자의 문자열
 */
function config_version_up (configuration_version) {
    let number = Number(configuration_version);
    number = (configuration_version >= 999) ? 1 : number + 1;
    return String(number).padStart(3, '0')
}

/**
 * Lambda function handler
 * @param {object} event {license_key: string, configuration_key: string, configuration_version: string, configuration_data: object, user: string}
 * @returns {object} 미정
 */
exports.handler = async (event, context) => {
    let lambda_status = 'success';
    let lambda_result = '';

    let check_license_params = {
        TableName: tableName,
        Key: {
            license_key: event['license_key']
        }
    }
    // 1. Check license_key & make config code
    const dynamo_response = await documentClient.get(check_license_params).promise();
    console.log('dynamo_response: ', dynamo_response)
    let config_key = null
    let config_version = null
    
    if (Object.keys(dynamo_response).length === 0) {
        config_key = await make_config_key()
        config_version = '000'
    } else {
        config_key = dynamo_response['Item']['configuration_key']
        config_version = dynamo_response['Item']['configuration_version']
    }
    
    console.log(`config code: ${config_key}${config_version}`)

    
    // 2. Dynamo DB에 config info 업데이트
    if (lambda_status === 'success') {
        const config_info = {
            license_key: event['license_key'],
            configuration_key: config_key,
            configuration_version: config_version_up(config_version),
            configuration_data: null,
            user: null
        }
    
        try {
            await update_config_info_dynamo(config_info)
        } catch (err) {
            lambda_status = 'error'
            lambda_result = `Error in uploading data on DynamoDB due to ${err}`
        }
    }

    // 3. Save at S3
    if (lambda_status === 'success') {
        const s3_file = {
            Key: `${config_key}${config_version}.json`,
            Body: "{ test: 'test' }"
        }

        try {
            await s3bucket.upload(s3_file).promise(); 
        } catch (err) {
            lambda_status = 'error'
            lambda_result = `Error in uploading file on S3 due to ${err}`
        }
    }

	// 4. Response to api gateway
    const response = (lambda_status === 'success') ? {
        statusCode: 200,
        body: {
            status: 'success',
            result: {
                config_code: `${config_key}${config_version}`
            }
        }
    } : {
        statusCode: 200,
        body: {
            status: 'error',
            result: lambda_result
        }
    }


    return response;
}