const parseArgs = require('minimist');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = __dirname + '/proto/struct.proto';
const packageDefinition = protoLoader.loadSync(
    PROTO_PATH,
    {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    }
);

module.exports = function(RED) {
    function GRPC(config) {
        let node = this;
        RED.nodes.createNode(node, config);

        node.name = config.name;
        node.host = config.host;
        node.port = config.port;
        node.service = config.service;
        node.method = config.method;
        node.request = JSON.parse(config.request) || "{}";

        const server = `${config.host}:${config.port}`;
        const grpc_package = grpc.loadPackageDefinition(packageDefinition);
        const proto_package_name = Object.keys(grpc_package)[0];
        const proto = grpc_package[proto_package_name];
        const client = new proto[node.service](server, grpc.credentials.createInsecure());

        const call = client[node.method](node.request, function(err, response) {
            // handling simple request
            if (err) {
                console.error(err);
                node.error(err);
            }
            else {
                console.info({payload: response});
                node.send({payload: response});
            }
        });

        // handling streams
        call.on('data',function(response) {
            console.info({payload: response});
            node.send({payload: response});
        });

        call.on('end',function() {
            call.end();
        });

        call.on('error', function(e) {
            console.error(e);
            node.error(e);
        });
    }

    RED.nodes.registerType("GRPC", GRPC);
}