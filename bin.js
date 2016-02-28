#!/usr/bin/env node

function usage () {/*

Usage

  http-file-store --config=/path/to/config.json

Options

  --config  | -c   Path to the JSON configuration file
  --verbose | -v   Enable verbosity pass in the module list to debug.

Config

  The configuration is a plain json object describing several options to
  apply to your instance of http-file-store.

  {
    "base": "/path/to/the/directory/to/read/write/files",
    "url_base": "/base/url/to/serve/files",
    "upload_path": "/base/to/temp/uploaded/files",
    "ssl": {
      "port": "a number, or null for a random port",
      "host": "a host value to listen for https requests",
      "key": "a path to an SSL key",
      "ca": "a path to the SSL CA file",
      "cert": "a path to the SSL cert file",
    },
    "clear": {
      "port": "a number, or null for a random port",
      "host": "a host value to listen for http requests",
    }
  }

*/}
var pkg   = require('./package.json')
var argv  = require('minimist')(process.argv.slice(2));
var help  = require('@maboiteaspam/show-help')(usage, argv.h||argv.help, pkg)
var debug = require('@maboiteaspam/set-verbosity')(pkg.name, argv.v || argv.verbose);
var fs    = require('fs')

const configPath  = argv.config || argv.c || false;

(!configPath) && help.print(usage, pkg) && help.die(
  "Wrong invokation"
);

var config = {}
try{
  config = require(configPath)
}catch(ex){
  help.die(
    "Config path must exist and be a valid JSON file.\n" + ex
  );
}

(!config) && help.print(usage, pkg)
&& help.die(
  "The configuration could not be loaded, please double check the file"
);

(!config.base) && help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : base is missing"
);

(!config.url_base)
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : url_base is missing"
);

(!config.upload_path)
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : upload_path is missing"
);

(!config.clear || !config.ssl)
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : you must provide one of clear or ssl options"
);

(!fs.existsSync(config.base))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : base directory must exist"
);

(config.ssl && !fs.existsSync(config.ssl.key))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL key file must exist"
);

(config.ssl && config.ssl.ca && !fs.existsSync(config.ssl.ca))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL ca file must exist"
);

(config.ssl && !fs.existsSync(config.ssl.cert))
&& help.print(usage, pkg)
&& help.die(
  "Configuration options are wrong : SSL cert file must exist"
);


var http        = require('http');
var https       = require('https');
var express     = require('express');
var bodyParser  = require('body-parser');
var multer      = require('multer');
var fileStore   = require('./index.js');


var upload = multer({ dest: config.upload_path });
var app = express();

app.get(config.base_url, fileStore.read(config.base));
app.post(config.base_url,
  upload.single('file'),
  fileStore.write(config.base, config.allowOverwrite));

if ( config.ssl && config.ssl.key && config.ssl.cert ) {
  var SSL = https.createServer( {
      key: fs.readFileSync( config.ssl.key ),
      cert: fs.readFileSync( config.ssl.cert ),
      ca: config.ssl.ca || []
  }, app );

  SSL.listen(config.ssl.port, config.ssl.host);
}

var CLEAR = http.createServer( app );

CLEAR.listen(config.lear.port, config.clear.host);
