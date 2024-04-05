#! /bin/sh
#
# Copyright (C) 2018 shlomif <shlomif@cpan.org>
#
# Distributed under the terms of the MIT license.
#
set -e -x
npm install
if ! test -e jStorage
then
    # git clone https://github.com/andris9/jStorage
    printf "%s\\n" "jStorage directory does not exist (maybe run git submodule)" 1>&2
    exit 1
fi

# npm install \
#     amdefine babel-cli babel-eslint babel-preset-env babel-preset-stage-2 big-integer browserify camel-case coffeescript eslint eslint-config-google flatted html-minifier prettier requirejs sass typescript uglify-es \
#     @types/jquery \
