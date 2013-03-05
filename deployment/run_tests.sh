#!/bin/bash

wait_for_heroku_to_wake_up() {
  local environment=$1

  curl --silent --insecure --url "https://$environment.inqob.com/hirefire" >/dev/null 2>&1
  sleep 5
  echo "Waiting for Heroku to wake-up: $(curl --silent --insecure --url "https://$environment.inqob.com/hirefire")"  
}

run_() { # this will run when the script is called without arguments
  echo "Running @current Features"

  NODE_ENV=development ./node_modules/.bin/cucumber.js tests/cucumber/features --format pretty --tags @current
  features=$?
  exit $features
}

run_development() {
  echo "Running All Features ~@skip against development"

  NODE_ENV=development ./node_modules/.bin/cucumber.js tests/cucumber/features --format pretty --tags ~@skip
  features=$?
  exit $features
}

run_test() {
  echo "Running All Features ~@skip against test"
  wait_for_heroku_to_wake_up test

  NODE_ENV=test ./node_modules/.bin/cucumber.js tests/cucumber/features --tags ~@skip
  features=$?
  exit $features
}

run_staging() {
  echo "Running @verify-against-production @verify-against-staging ~@clean-mongo-db ~@skip against staging"
  wait_for_heroku_to_wake_up staging

  NODE_ENV=staging ./node_modules/.bin/cucumber.js tests/cucumber/features --tags @verify-against-staging --tags ~@skip
  features=$?
  exit $features
}

run_production() {
  echo "Running @verify-against-production ~@clean-mongo-db ~@skip against production"
  wait_for_heroku_to_wake_up production

  NODE_ENV=production ./node_modules/.bin/cucumber.js tests/cucumber/features --tags @verify-against-production --tags ~@clean-mongo-db --tags ~@skip
  features=$?
  exit $features
}

TARGET_ENVIRONMENT=$1
run_${TARGET_ENVIRONMENT}