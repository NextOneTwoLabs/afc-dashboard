# Reading www.the-afc.com with curl
The AFC server sends gzip. Plain curl saves ~8 KB of compressed bytes that look empty.
Always use `curl --compressed`; news/report pages are then 48–54 KB of readable HTML with the result in <title>.
