# Mite


[![Build Status](https://travis-ci.org/jdc0589/mite-node.png?branch=master)](https://travis-ci.org/jdc0589/mite-node)

Mite is a sql schema migration utility. It lets you define schema migrations in plain old sql and easy manipulate the migration state of your database. Since database migrations are defined in files within your project, you get all the benefits of source control to manage changes to your database schema.

#### supported databases

- MySQL

### Installation

From the terminal:
```npm install -g mite```

Mite is primarily a command line application; the global install will add `mite` to your path.


### Initializing a mite project
First, copy [the example configuration](https://raw.github.com/jdc0589/mite-node/master/mite.config.example) in to the root of your project (usually the source control root), and rename it to `mite.config`. Then modify the settings to match your environment. For more information, refer to the [Configuration](#configuration) section. At some point this will be part of `mite init`, but we aren't quite there yet.

Next, run `mite init` from the directory containing `mite.config`. This will create a `migrations` directory and create a `_migrations` table in your database.

Run `mite status` to make sure everything worked as expected; it should report a 'clean' status.


### your first migration

Once mite is initialized, execute `mite create`.
This will create a template for your first migration in `migrations/`, identified by a timestamp. Open the new fiile up, and after the `/* mite:up */` comment add some statements to create a new table/tables.
After the `/* mite:down */` comment, add statements to rollback anything done in the `up` section (usually `drop table` statements).

Next, run `mite status`. It should tell you there is an unexecuted migration. This means you have some migrations defined on disk that haven't been executed yet.

Execute `mite up` to run any unexecuted migrations. New tables defined in the `up` section of you first migration should now exist in your database, and a subsequent call to `mite status` should report that the state is clean.

Thats it! You just set up mite and created + ran your first migration.




## Commands
mite uses a lot of `git` style commands and subcommands. You can execute mite commands from anywhere within a mite project, even in subdirectories. `mite help` or `mite help [command]` will always give you usage information.


**version** - displays the current version of mite.

**status** - displays the migration status. the status can be clean, unexecuted, or dirty.

**init** - create the `migrations` directory and initialize the `_migration` table in your database.

**create** - creates a new empty migration in the `migrations/` directory.

**up** - runs any unexecuted migrations. The status must not be dirty prior to runing `mite up`

**stepup** - run the first unexecuted migration

**down** - run the down migrations from the current *head* all the way down to the first migration. This is destructive and should never be run in a production environment.

**stepdown** - run the down of the last executed migration. This is destructive and should never be run in a production environment.

**help** - print usage information

**help [command]** - print usage information for a specific command


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

**database** - the database name for your project

**host** - the host of your database server

**user** - the user name with read, write, create, and drop privileges for your database

**password** - the password for the specified user

**dialect** - the sql dialect for the mite project.

**port** - the port of for your database server


## submodules

submodules allow a mite project to, in addition to a normal set of migrations, know about migrations defined in dependencies of you main project.

__use case:__
You are working on a todo web application, 'todoer'. You have an abstracted library, 'authenticator', that handles user/role management; it requires some tables in your database. We will pretend this is a nodejs application, you project structure looks like this:

![structure](http://i.imgur.com/1biTJWt.png)

All the migrations for todoer are executed, but you just installed the authenticator dependency.

Running `mite status` now produces:

![status](http://imgur.com/fjxWLP8.png)

cool! mite knows about our submodule now. `mite submodules` produces:

![submodules](http://i.imgur.com/5Hmnaxa.png)

Lets get a better idea of what authenticator's migration status looks like:

![sub status](http://i.imgur.com/kCWYkre.png)

alright, well we need to execute an `up` to get everything clean:

![sub up](http://i.imgur.com/SIT1Zfd.png)

now `status` produces:

![clean status](http://i.imgur.com/ZyfY59f.png)

thats it. submodules inherit all settings from the `.mite` config of your main project. submodules need migrations + a `.mite` file, but it can be empty right now. the other mite commands work on submodules too. 


## Running Tests
To run the unit tests, make sure all dependencies are up to date via `npm install` and run:

	npm test


# Contributing
Pull requests are always welcome; just try and open an issue about the feature/change you are making first so we have a chance to briefly discuss it. If you are making changes to the backend (lib/mite.js) or the migration provider, make to add tests.

### setting up a dev environment
1. fork this repo
2. clone your fork locally
3. if you already have mite installed, remove it via `npm uninstall --global mite`
4. cd in to your local repo
5. execute `npm link`

After that, the `mite` in your path is linked to you local repo, so any changes you make are immediately live.
