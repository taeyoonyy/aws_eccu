'use strict'
const AWS = require('aws-sdk');
const tableName = 'ECCU_TEST_DYNAMO';
const documentClient = new AWS.DynamoDB.DocumentClient({  region: 'ap-northeast-2'});
/**
 * Lambda 함수 핸들러. 
 * DynbamoDB table에 데이터 put
 */
exports.handler = async (event, context) => {
    const params = {
        TableName: tableName,
        Item: {
            license_key: "test4",
            configuration_key: 'yty5'
        }
    }

    try {
        const data = await documentClient.put(params).promise();
        console.log(data);
    } catch (err) {
        console.log(err);
    }
}