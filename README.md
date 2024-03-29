Solitairey is a JavaScript Solitaire collection using YUI 3.

A [playable version is available online](https://foss-card-games.github.io/Solitairey/) on GitHub Pages.

This is a [FOSS](https://en.wikipedia.org/wiki/Free_and_open-source_software) fork of the most recent version
of the original repository by Paul Harrington that had a LICENSE file.

Current games include:

- Agnes
- Flower Garden
- Forty Thieves
- Freecell
- Golf
- Grandfather's Clock
- Klondike
- Monte Carlo
- Pyramid
- Russian Solitaire
- Scorpion
- Spider (1, 2, and 4 Suit)
- Spiderette
- Tri Towers
- Will O' The Wisp
- Yukon

Build Process:
==============

```
bash -ex bin/install-npm-deps.sh
rake
rake test
rake upload
```

License
=======

(FreeBSD License)

Copyright 2011 Paul Harrington <pharrington@solitairey.com>. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are
permitted provided that the following conditions are met:

   1. Redistributions of source code must retain the above copyright notice, this list of
      conditions and the following disclaimer.

   2. Redistributions in binary form must reproduce the above copyright notice, this list
      of conditions and the following disclaimer in the documentation and/or other materials
      provided with the distribution.

THIS SOFTWARE IS PROVIDED BY PAUL HARRINGTON ''AS IS'' AND ANY EXPRESS OR IMPLIED
WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL PAUL HARRINGTON OR
CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The views and conclusions contained in the software and documentation are those of the
authors and should not be interpreted as representing official policies, either expressed
or implied, of Paul Harrington <pharrington@solitairey.com>.
