
'use strict'
const AWS = require('aws-sdk');
const s3bucket = new AWS.S3({params: {Bucket: 'yty-s3-test'}});

exports.handler = async (event, context) => {
    const params = {
        Key: "abc.txt",
        Body: "aaa",
    };

    try {
        const data = await s3bucket.upload(params).promise();
        console.log("File successfully uploaded.")
        console.log(data);
    } catch (err) {
        console.log("Error in uploading file on s3 due to "+ err)
    }
}