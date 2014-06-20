:warning: *Use of this software is subject to important terms and conditions as set forth in the License file* :warning:

# Satisfaction Console App
A full-page nav bar app for pulling ticket satisfaction ratings from the past x days and providing a ticket export CSV via data-uri.


### Compatibility Note
This app depends on full browser support of data-uris. Some versions of IE do not appear to offer full support so may not work. Other browsers don't support naming the file so you'll have to rename it with a .csv extension yourself.

**Normally Chrome is recommended because it can name the file, but it currently has a known bug that breaks the name and extension of the file that is downloaded. [A fix is coming.](https://src.chromium.org/viewvc/blink?revision=176548&view=revision)**

More: http://caniuse.com/datauri
