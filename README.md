# Mite
=======
[![Build Status](https://travis-ci.org/jdc0589/mite-node.png?branch=master)](https://travis-ci.org/jdc0589/mite-node)

Mite is a utility for database schema management.  This utility allows database schema versioning for a project.

### Supported databases

- MySQL

## Getting Started

To use the Mite CLI, run:

	npm install -g mite

This will install mite.  Once that has sucessfully installed, from the root directory of your project, run:

	mite init

This will add the mite.config file to your project.  You should open that file and configure the settings to match the configuration settings for your project.

*For more information, refer to the [Configuration](#configuration) section of this document.

Once mite is configured on your project, run:

	mite create

This will create the first file that will be managed by mite.  Add SQL statements to that file and run:

	mite update

Now, your database schema will be updated to include your newly created SQL statements.


## Commands

**version** - Displays the current version of the Mite utility. 

**status** - Displays the status of the database configured in the mite.config file.

**init** - Creates an initial mite.config file with defaults.

**up** - updates the schema to the most recent version.

**help** - prints available options with descriptions.

**create** - creates a new SQL file in the migrations directory that will be added to Mite migrations.

## Configuration

The mite.config file, by default, will contain the following:

	{
	  "database": "mitedevel",
	  "host": "localhost",
	  "user": "mite",
	  "password": "mite",
	  "dialect": "mysql",
	  "port": 3306
	}

### Fields

**database** - Specifies the database name for the Mite configuration.

**host** - Specifies the host name for the Mite configuration.

**user** - Specifies the user name for the Mite configuration.

**password** - Specifies the password for the Mite configuration.

**dialect** - Specifies the dialect for the Mite configuration.  Options are mysql, postgresql, and mariadb.

**port** - Specifies the port for the Mite configuration.

## Running Tests

To run the unit tests for this project, make sure all dependencies are up to date and run:

	npm test
