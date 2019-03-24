nohup node ./target/bin/www.js >> SERVER.LOG 2>&1 &
echo $! > PID
echo web server started.
