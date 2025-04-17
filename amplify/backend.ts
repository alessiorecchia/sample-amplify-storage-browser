import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { 
  CloudFormationClient,
  ListStackResourcesCommand,
} from "@aws-sdk/client-cloudformation";
import {
  S3Client,
  ListObjectsCommand
} from "@aws-sdk/client-s3"
import { ConsoleLogger } from 'aws-amplify/utils';

ConsoleLogger.LOG_LEVEL = 'VERBOSE';

const logger = new ConsoleLogger('foo');

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */

const cfClient = new CloudFormationClient({ region: "eu-west-1", });
const cfInput = {
  StackName: "IdwWeatherCommonResources",
}
const s3Client = new S3Client({});

const cfCommand = new ListStackResourcesCommand(cfInput);
const response = await cfClient.send(cfCommand)

// logger.info(response.StackResourceSummaries)
// logger.info('Next Token', response.NextToken);

const cfBody = JSON.stringify(response.StackResourceSummaries);
const cfBodyJson = JSON.parse(cfBody);
var bucket = '';
cfBodyJson.forEach((element: { [x: string]: any; }) => {
  if (element['LogicalResourceId'] === 'SourceDataFilesBucket') {
    // logger.info('########### Bucket: ', element['PhysicalResourceId']);
    bucket = element['PhysicalResourceId'];
  }
});

const customBucketName = bucket;

const s3Input = {
  Bucket: bucket,
  Delimiter: "/",
}
const s3Command = new ListObjectsCommand(s3Input);
const s3Response = await s3Client.send(s3Command);

// logger.info('########### Bucket elements: ', s3Response.CommonPrefixes);
const s3Body = JSON.stringify(s3Response.CommonPrefixes);
const s3JsonBody = JSON.parse(s3Body);

interface Paths {
  [folder: string]: object;
}
var paths: Paths = {};
var authPolicyResources: string[] = [];
var stringLikeConditions: { [string: string]: string[]};
stringLikeConditions = {};
stringLikeConditions['s3:prefix'] = [];


s3JsonBody.forEach((element: { [x: string]: any; }) => {
  var folder = element['Prefix'] + '*';
  paths[folder] = {
    authenticated: ['get', 'list']
  };
  authPolicyResources.push(`arn:aws:s3:::${customBucketName}/${folder}`);
  stringLikeConditions['s3:prefix'].push(element['Prefix']);
  stringLikeConditions['s3:prefix'].push(folder);
});

// logger.info('########## Paths: ', paths)
// logger.info('############### String Like:', stringLikeConditions);
// logger.info('############### Auth policies:', authPolicyResources);
// logger.info('################## AUTH: ', auth)
const backend = defineBackend({
  auth,
});

backend.addOutput({
  storage: {
    aws_region: 'eu-west-1',
    bucket_name: customBucketName,
    buckets: [
      {
        name: 'Wheater data archive',
        bucket_name: customBucketName,
        aws_region: 'eu-west-1',
        paths: paths
      }
    ]
  }
});

/**
 * Define an inline policy to attach to Amplify's auth role
 * This policy defines how authenticated users can access your existing bucket
 */
const authPolicy = new Policy(backend.stack, "customBucketAuthPolicy", {
  statements: [
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:GetObject", "s3:ListObject"],
      resources: authPolicyResources,
    }),
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:ListBucket"],
      resources: [
        `arn:aws:s3:::${customBucketName}`,
        `arn:aws:s3:::${customBucketName}/*`,
      ],
      conditions: {
        StringLike: stringLikeConditions
      },
    }),
  ],
});

// logger.info("############### IAM ROLE: ", backend.auth.resources.authenticatedUserIamRole.roleArn)

// Add the policies to the authenticated user role
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(authPolicy);