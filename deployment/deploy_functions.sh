#!/bin/bash

get_environment_name() {
  local environment=$1

  variable_name="environment_names_for_$environment"
  echo ${!variable_name}
}

install_cairo_dependencies() {
  sudo apt-get install libcairo2-dev libjpeg8-dev libpango1.0-dev libgif-dev build-essential g++
}

install_and_setup_heroku() { 
  # this may not work because the script will ask for a password (at least on my mac)
  heroku >/dev/null 2>&1
  RESULT=$?
  if [ $RESULT -ne 0 ]; then
    wget -qO- https://toolbelt.heroku.com/install-ubuntu.sh | sudo sh >/dev/null
  fi

  cat <<EOF > ~/.ssh/config
Host heroku.com
  StrictHostKeyChecking no
  CheckHostIP no
  UserKnownHostsFile=/dev/null
EOF

  # I believe this is needed to get access to Heroku
  export HEROKU_API_KEY=$heroku_api_key
  
  heroku keys:clear >/dev/null 2>&1
  yes | heroku keys:add >/dev/null 2>&1
}

add_git_remotes_for_heroku() {
  git remote rm $(get_environment_name test) >/dev/null 2>&1
  git remote rm $(get_environment_name staging) >/dev/null 2>&1
  git remote rm $(get_environment_name production) >/dev/null 2>&1
  
  cat <<EOF >> .git/config
[remote "$(get_environment_name test)"]
  url = url = git@heroku.com:$(get_environment_name test).git
  fetch = +refs/heads/*:refs/remotes/heroku/*
[remote "$(get_environment_name staging)"]
  url = url = git@heroku.com:$(get_environment_name staging).git
  fetch = +refs/heads/*:refs/remotes/heroku/*
[remote "$(get_environment_name production)"]
  url = url = git@heroku.com:$(get_environment_name production).git
  fetch = +refs/heads/*:refs/remotes/heroku/*
EOF
}

install_phantomjs_and_casperjs() {
  brew install casperjs >/dev/null 2>&1
}

start_node_server() {
  NODE_ENV=development node app/app.js >/dev/null 2>&1 &
}

kill_node_server() {
  kill -9 $(ps | grep -m 1  "node" | cut -c 1-5) >/dev/null 2>&1
}

print_banner(){
  echo ""
  echo ""
  echo "---------- $1 ----------"
}

print_line(){
  echo $1
}

stop_if_not_production_branch() {
  if [[ "$TRAVIS_BRANCH" != 'master' ]]; then
    print_banner "Current branch $TRAVIS_BRANCH"
    print_line 'Not the master branch! So this will not be published to production!'
    exit 0
  fi  
}

rollback_heroku_instance() {
  local heroku_app_name=$(get_environment_name $1)
  
  print_banner "rolling back $heroku_app_name"
  
  heroku releases:rollback --app $heroku_app_name
}

run_tests_against_environment() {
  local environment=$1
  
  NODE_ENV=$environment $(dirname -- "$0")/run_tests.sh $environment
  RESULT=$?
  if [ $RESULT -ne 0 ]; then
    print_banner "$environment tests failed"
    
    if [[ "$environment" = "development" ]]; then
      kill_node_server
    fi
    if [[ "$environment" = "production" ]]; then
      rollback_heroku_instance $environment
    fi
    
    exit 1
  fi
}

create_heroku_instance_if_needed() {
  local environment=$1
  local heroku_app_name=$(get_environment_name $environment)

  heroku apps | grep -q "$heroku_app_name"
  RESULT=$?
  if [[ $RESULT -ne 0 ]]; then
    heroku apps:create $heroku_app_name
    heroku domains:add $environment.inqob.com --app $heroku_app_name
  fi
  heroku config:set NODE_ENV=$environment --app $heroku_app_name >/dev/null 2>&1
}

deploy_code_to_heroku() {
  local git_remote=$(get_environment_name $1)

  yes | git push $git_remote master 2>&1 | grep -q "Everything up-to-date"
  RESULT=$?
  if [ $RESULT -eq 0 ]; then
    print_line "$git_remote already had latest code deployed!"
    print_line "Continueing"
  fi  
}

