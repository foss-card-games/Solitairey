#! /usr/bin/env bash
#
# copy-web-fc-solve.bash
# Copyright (C) 2018 Shlomi Fish <shlomif@cpan.org>
#
# Distributed under the terms of the MIT license.
#

set -e -x

fcs_site="${FC_SOLVE_SITE:-/home/shlomif/progs/freecell/git/fc-solve/fc-solve/site/wml}"
cp -f "$fcs_site"/dest/js/lib{freecell,fcs-wrap}* ext/libfreecell-solver/
cp -f "$fcs_site"/src/ts/{capitalize-cards,fcs-validate,web-fc-solve--expand-moves,web-fc-solve,web-fcs-api-base}.ts src/ts/
