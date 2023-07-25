# Tixet API

## Description

This repository is a NestJS API for the Tixet project. It is used to create and manage tickets for events and to mint NFTs for each ticket as well as redeem them.

## Requirements

- [Node.js >= 16.0.0](https://nodejs.org/en/download/)
- Duplicate the `.dev.env` file and rename it to `.env`. Fill in the missing values.

Optional: (e.g. for Docker or if installation of iota npm package fails, because of missing prebuilt binaries)
- [Rust & Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)
- [Docker & Docker Compose](https://docs.docker.com/compose/install/)

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Docker

To build and run the container using this updated setup, run the following command:

```bash
docker-compose up --build
```

This will build the Docker image and start the container. The API will be available at http://localhost:3000.


