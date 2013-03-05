#!/bin/bash

if [[ "$1" != "run-me" ]];
then
  echo "In order to prevent accidental deployments you have to call this with: './deploy.sh run-me'"
  exit 1
fi

heroku_api_key="121a03d4f1b588ced2ae889a80d2aac79f998c1e"

environment_names_for_test="inqob-test"
environment_names_for_staging="inqob-staging"
environment_names_for_production="inqob-production"

git_remote_name_for_test="inqob-test"
git_remote_name_for_staging="inqob-staging"
git_remote_name_for_production="inqob-production"

source $(dirname -- "$0")/deploy_functions.sh


install_and_setup_heroku
add_git_remotes_for_heroku
install_phantomjs_and_casperjs
install_cairo_dependencies

print_banner "start testing LOCAL environment"
start_node_server
run_tests_against_environment development
kill_node_server


# print_banner "start deployment to TEST environment"
# create_heroku_instance_if_needed test
# deploy_code_to_heroku test
# run_tests_against_environment test
# 
# 
# print_banner "start deployment to STAGING environment"
# create_heroku_instance_if_needed staging
# deploy_code_to_heroku staging
# run_tests_against_environment staging

stop_if_not_production_branch

print_banner "start deployment to PRODUCTION environment"
deploy_code_to_heroku production
run_tests_against_environment production

