// import { defineAuth } from '@aws-amplify/backend';

// /**
//  * Define and configure your auth resource
//  * @see https://docs.amplify.aws/gen2/build-a-backend/auth
//  */
// export const auth = defineAuth({
//   loginWith: {
//     email: true,
//   },
// });

import { referenceAuth } from '@aws-amplify/backend';
import { ConsoleLogger } from 'aws-amplify/utils';
// import dotenv from 'dotenv';

// dotenv.config()

import {
  CognitoIdentityClient,
  ListIdentityPoolsCommand
} from "@aws-sdk/client-cognito-identity";
import {
  CognitoIdentityProviderClient,
  ListUserPoolsCommand,
  ListUserPoolClientsCommand
} from "@aws-sdk/client-cognito-identity-provider";
import {
  IAMClient,
  ListRolesCommand
} from "@aws-sdk/client-iam";
import { log } from 'console';

ConsoleLogger.LOG_LEVEL = 'VERBOSE';

const logger = new ConsoleLogger('foo');
const clientConfig = {region: 'eu-west-1'}
const identityPoolClient = new CognitoIdentityClient(clientConfig);
const userPoolClient = new CognitoIdentityProviderClient(clientConfig);
const iamClient = new IAMClient(clientConfig);

const identityPoolCommand = new ListIdentityPoolsCommand({MaxResults: 10});
const identityPools = JSON.stringify((await identityPoolClient.send(identityPoolCommand)).IdentityPools);

const userPoolCommand = new ListUserPoolsCommand({MaxResults: 10})
const userPools = JSON.stringify((await userPoolClient.send(userPoolCommand)).UserPools);

interface Dictionary<T> {
  [key: string]: T
};

var iamInput: Dictionary<string> = {
  PathPrefix: '/'
}
var iamCommand = new ListRolesCommand(iamInput);

var nextToken = 'Token';
var authRoleArn = '';
var unauthRoleArn = '';

while (nextToken) {
  const iamRoles = await iamClient.send(iamCommand);
  nextToken = JSON.stringify(iamRoles.Marker);
  // logger.info('################ MARKER BEFORE: ', nextToken);
  if (nextToken) {
    nextToken = JSON.parse(nextToken);
    // logger.info('################ MARKER: ', nextToken);
    var iamRolesBody = JSON.stringify(iamRoles.Roles);
    iamInput['Marker'] = nextToken;
    var iamRolesParsed = JSON.parse(iamRolesBody);
    iamRolesParsed.forEach((element: { [x: string]: any; }) => {
      if (element['RoleName'] === 'amplify-browsingapp-amplifyAuthenticatedUsers') {
        // logger.info('########### AUTH ARN: ', element['Arn']);
        authRoleArn = element['Arn'];
      }
    });
    iamRolesParsed.forEach((element: { [x: string]: any; }) => {
      if (element['RoleName'] === 'amplify-browsingapp-amplifyUnauthenticatedUsers') {
        // logger.info('########### UNAUTH ARN: ', element['Arn']);
        unauthRoleArn = element['Arn'];
      }
    });
  }
}

var cognitoIdentityPoolId = extractInfoFromResponse('IdentityPoolName',
                                                    'Amplify-S3-Browsing-test-app-identity-pool',
                                                    'IdentityPoolId',
                                                    identityPools
);
var cognitoUserPoolId = extractInfoFromResponse('Name',
  'Amplify-S3-Browsing-test-app-user-pool',
  'Id',
  userPools
);

// logger.log('############# USER_POOL_ID', cognitoUserPoolId);
const appClientCommand = new ListUserPoolClientsCommand({
  UserPoolId: cognitoUserPoolId,
  MaxResults: 10
});
const appClientresponse = await userPoolClient.send(appClientCommand);

// logger.info('##################### IAM CLIENT RESPONSE: ', iamRoles);

const appClientPools = JSON.stringify(appClientresponse.UserPoolClients);


var cognitoAppClientId = extractInfoFromResponse('UserPoolId',
                                                 cognitoUserPoolId,
                                                 'ClientId',
                                                 appClientPools
)

export const auth = referenceAuth({
  userPoolId: cognitoUserPoolId!,//'eu-west-1_q9Bnl8CdM',
  identityPoolId: cognitoIdentityPoolId!, //'us-east-1:b57b7c3b-9c95-43e4-9266-xxxx',
  authRoleArn: authRoleArn!, //'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthauthenticatedU-xxxx',
  unauthRoleArn: unauthRoleArn!, //'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthunauthenticate-xxxx',
  userPoolClientId: cognitoAppClientId! //'xxxx',
});



// logger.info('############ USER POOL ID: ', process.env.USER_POOL_ID);
// logger.log('############# COGNITO_IDENTITY_POOL_ID', process.env.COGNITO_IDENTITY_POOL_ID);
// logger.log('############# COGNITO_AUTH_ROLE_ARN', process.env.AUTH_ROLE_ARN);
// logger.log('############# COGNITO_UNAUTH_ROLE_ARN', process.env.UNAUTH_ROLE_ARN);
// logger.log('############# APP_CLIENT_ID', process.env.APP_CLIENT_ID);

// export const auth = referenceAuth({
//   userPoolId: process.env.USER_POOL_ID!,//'eu-west-1_q9Bnl8CdM',
//   identityPoolId: process.env.COGNITO_IDENTITY_POOL_ID!, //'us-east-1:b57b7c3b-9c95-43e4-9266-xxxx',
//   authRoleArn: process.env.AUTH_ROLE_ARN!, //'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthauthenticatedU-xxxx',
//   unauthRoleArn: process.env.UNAUTH_ROLE_ARN!, //'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthunauthenticate-xxxx',
//   userPoolClientId: process.env.APP_CLIENT_ID! //'xxxx',
// });




function extractInfoFromResponse(filterField: string,
                                 filterValue:string,
                                 targetField: string,
                                 responseElements?: string ) {
  // const cognitoBody = JSON.stringify(responseElements);
  // logger.info('################## TARGET FIELD: ', targetField);
  // logger.info('################## RESPONSE ELEMENTS: ', responseElements);
  const cognitoBodyJson = JSON.parse(responseElements!);
  var targetValue = '';
  cognitoBodyJson.forEach((element: { [x: string]: any; }) => {
    if (element[filterField] === filterValue) {
      targetValue = element[targetField];
    }
  });
  return targetValue;
}







// ORIGINAL TEMPLATE
// import { referenceAuth } from '@aws-amplify/backend';

// export const auth = referenceAuth({
//   userPoolId: 'us-east-1_xxxx',
//   identityPoolId: 'us-east-1:b57b7c3b-9c95-43e4-9266-xxxx',
//   authRoleArn: 'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthauthenticatedU-xxxx',
//   unauthRoleArn: 'arn:aws:iam::xxxx:role/amplify-xxxx-mai-amplifyAuthunauthenticate-xxxx',
//   userPoolClientId: 'xxxx',
// });
