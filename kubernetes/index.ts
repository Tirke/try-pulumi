import * as k8s from '@pulumi/kubernetes'
import * as eks from '@pulumi/eks'
import * as awsx from "@pulumi/awsx";

const appName = 'nginx'
const appLabels = {app: appName}

// Create a VPC for our cluster.
const vpc = new awsx.ec2.Vpc("vpc", {subnets: [{type: "public"}]});

// Create the EKS cluster, including a "gp2"-backed StorageClass and a deployment of the Kubernetes dashboard.
// Create the EKS cluster itself and a deployment of the Kubernetes dashboard.
const cluster = new eks.Cluster("cluster", {
    vpcId: vpc.id,
    subnetIds: vpc.publicSubnetIds,
    instanceType: "t2.medium",
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
});

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
