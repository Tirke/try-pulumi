import * as k8s from '@pulumi/kubernetes'
import * as eks from '@pulumi/eks'
import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as pul from '@pulumi/pulumi'

const appName = 'nginx'
const appLabels = {app: appName}

// Create a VPC for our cluster.
const vpc = new awsx.ec2.Vpc('eks-vpc', { });

// Create the EKS cluster, including a "gp2"-backed StorageClass and a deployment of the Kubernetes dashboard.
const cluster = new eks.Cluster('eks-cluster', {
    vpcId: vpc.id,
    subnetIds: pul.all([vpc.publicSubnetIds, vpc.privateSubnetIds]).apply(([ids]) => ids)
})

const deployment = new k8s.apps.v1.Deployment(`${appName}-dep`, {
    metadata: {labels: appLabels},
    spec: {
        replicas: 2,
        selector: {matchLabels: appLabels},
        template: {
            metadata: {labels: appLabels},
            spec: {
                containers: [{
                    name: appName,
                    image: "nginx",
                    ports: [{name: "http", containerPort: 80}]
                }],
            }
        }
    },
}, {provider: cluster.provider});

// Expose nginx on a public endpoint
const service = new k8s.core.v1.Service(`${appName}-svc`, {
    metadata: {labels: appLabels},
    spec: {
        type: "LoadBalancer",
        ports: [{port: 80, targetPort: "http"}],
        selector: appLabels,
    },
}, {provider: cluster.provider});


// Export the URL for the load balanced service.
export const url = service.status.loadBalancer.ingress[0].hostname;

// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig;


const group = new awsx.ec2.SecurityGroup("webserver-secgrp", {
    ingress: [
        {protocol: "tcp", fromPort: 22, toPort: 22, cidrBlocks: ["0.0.0.0/0"]},
    ],
});