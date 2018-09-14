import * as k8s from '@pulumi/kubernetes'
import * as infra from '@pulumi/aws-infra'
import * as eks from '@pulumi/eks'

const appName = 'nginx'
const appLabels = {app: appName}

// Create a VPC for our cluster.
const vpc = new infra.Network('eks-vpc')

// Create the EKS cluster, including a "gp2"-backed StorageClass and a deployment of the Kubernetes dashboard.
const cluster = new eks.Cluster('eks-cluster', {
    vpcId: vpc.vpcId,
    subnetIds: vpc.subnetIds,
    deployDashboard: true,
    desiredCapacity: 2,
    minSize: 1,
    maxSize: 2,
    instanceType: 't2.medium',
    storageClasses: 'gp2'
})

// Deploy nginx 1 time
const nginx = new k8s.apps.v1.Deployment(appName, {
    spec: {
        selector: {matchLabels: appLabels},
        replicas: 1,
        template: {
            metadata: {labels: appLabels},
            spec: {containers: [{name: appName, image: 'nginx'}]}
        }
    }
}, {provider: cluster.provider})

// Expose nginx on a public endpoint
const service = new k8s.core.v1.Service(appName, {
    metadata: {labels: nginx.spec.apply(spec => spec.template.metadata.labels)},
    spec: {
        type: 'LoadBalancer',
        ports: [{port: 80, targetPort: 80, protocol: 'TCP'}],
        selector: appLabels
    }
}, {provider: cluster.provider})


// Export the cluster's kubeconfig.
export const kubeconfig = cluster.kubeconfig
// Export nginx public endpoint
export const nginxHost = service.status.apply(status => status.loadBalancer.ingress[0].hostname)
