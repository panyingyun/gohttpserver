docker rm -f gohttpserver
docker build --network=host -t gohttpserver:latest .
docker run -itd --restart=always  -v /opt/gohttpserver:/data -p 8080:8080   -e BASE_URL=http://192.168.1.80:8080  --name  gohttpserver  gohttpserver:latest --upload --delete