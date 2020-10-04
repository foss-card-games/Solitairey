#! /usr/bin/env bash
#
# copy-web-fc-solve.bash
# Copyright (C) 2018 Shlomi Fish <shlomif@cpan.org>
#
# Distributed under the terms of the MIT license.
#

fcs_site="${FC_SOLVE_SITE:-/home/shlomif/progs/freecell/git/fc-solve/fc-solve/site/wml}"
cp -f "$fcs_site"/dest/js/lib{freecell,fcs-wrap}* ext/libfreecell-solver/
