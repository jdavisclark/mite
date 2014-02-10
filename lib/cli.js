#!/usr/bin/env node

var Mite = require("./mite"),
	program = require('commander'),
	moment = require('moment'),
	path = require('path'),
	fs = require('fs'),
	sha1 = require('sha1'),
	mitePackage = require(path.join(__dirname, "../", "package.json"));

var miteRoot = getMiteRoot(process.cwd()),
	mite = null;

if(!miteRoot) {
	console.error("fatal: not a mite project (or any of the parent directories): mite.config");
	process.exit(1);
}

var config = JSON.parse(fs.readFileSync(path.join(miteRoot, "mite.config"), "utf8"));
mite = new Mite(config);

program
	.version(mitePackage.version);
	
program
	.command("create")
	.description("create a new migratrion")
	.action(function() {
		create(mite);
	});

program
	.command("status")
	.description("show migratrion status")
	.action(function() {
		status(mite);
	});

program
	.command("init")
	.description("init the _migration table and migrations directory")
	.action(function() {
		init(mite);
	});

program.parse(process.argv);

function getMiteRoot(dir) {
	var prev = null;

	while (prev !== "/" && dir !== "/") {
		var files = fs.readdirSync(dir);
		
		if (files.some(function(x) { return x === "mite.config"; })) {
			return dir;			
		} else {
			prev = dir;
			dir = path.join(dir, "../");
		}
	}

	return null;
}

function handleError (err) {
	if(err) {
		console.error(err);
		process.exit(1);
	}
}

function create (api) {
	api.create(function(err) {
		handleError(err);
		console.info("[ mite: create ]");

		console.info("(complete)");
	});
}

function status (api) {
	api.create(function(err) {
		handleError(err);
		console.info("[ mite: status ]");

		console.info("(complete)");
	});
}

function init (api) {
	api.init(function(err) {
		handleError(err);

		console.info("_migration table created...");

		// create migrations directory
		var migrationsPath = path.join(miteRoot, "migrations");

		if(fs.existsSync(migrationsPath)) {
			var stats = fs.lstatSync(migrationsPath);
			
			if(!stats.isDirectory()) {
				console.error("fatal: 'migrations' exists at the mite root, but it is not a directory (" + migrationsPath + ").");
				process.exit(1);
			}

			console.info("'migrations' directory exists...skipping");			
		} else {
			fs.mkdirSync(migrationsPath);
			console.info("'migrations' directory created...")
		}

		console.info("(complete)");
	});
}






