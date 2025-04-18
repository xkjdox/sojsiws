/*
* Jembatan Proksi
* Hak Cipta PANCHO7532 - P7COMUnications LLC (c) 2021
* Didedikasikan untuk Emanuel Miranda, karena telah memberi saya ide untuk membuat ini :v
*/
const net = require('net');
const stream = require('stream');
const util = require('util');
var dhost = "127.0.0.1";
var dport = "109";
var mainPort = "2052";
var outputFile = "outputFile.txt";
var packetsToSkip = 0;
for (c = 0; c < process.argv.length; c++) {
    switch(process.argv[c]) {
        case "-skip":
            packetsToSkip = process.argv[c + 1];
            break;
        case "-dhost":
            dhost = process.argv[c + 1];
            break;
        case "-dport":
            dport = process.argv[c + 1];
            break;
        case "-mport":
            mainPort = process.argv[c + 1];
            break;
        case "-o":
            outputFile = process.argv[c + 1];
            break;
    }
}
function parseRemoteAddr(raddr) {
    if (raddr.toString().indexOf("ffff") != -1) {
        return raddr.substring(7, raddr.length);
    } else {
        return raddr;
    }
}
const activeConnections = new Set();
let lastRemoteErrorLog = 0;
const logInterval = 60000; // Log kesalahan [REMOTE] setiap 60 detik
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.heapUsed > 100 * 1024 * 1024) { // Ambang batas 100MB
        console.warn("[MEM] Penggunaan memori tinggi: " + (memoryUsage.heapUsed / 1024 / 1024).toFixed(2) + " MB");
        if (global.gc) {
            global.gc();
            console.warn("[MEM] Global garbage collector dipanggil untuk mengurangi memori");
        } else {
            console.warn("[MEM] Global.gc tidak tersedia, jalankan dengan --expose-gc untuk pengelolaan memori");
        }
        activeConnections.forEach(conn => {
            if (!conn.writable || !conn.readable) {
                conn.destroy();
                activeConnections.delete(conn);
            }
        });
    }
}, 60000); // Periksa setiap 60 detik
const server = net.createServer();
server.on('connection', function(socket) {
    var packetCount = 0;
    var anu = "SCRIPT BY t.me/user_legend";
    socket.write("HTTP/1.1 101 " + anu.fontcolor("green") + "\r\nUpgrade: websocket\r\n\r\nSec-WebSocket-Accept: foo\r\n\r\n", function(err) {
        if(err) {
            console.log("[SWRITE] Failed to write response to " + socket.remoteAddress + ":" + socket.remotePort + ", error: " + err);
            socket.destroy();
        }
    });
    var conn = net.createConnection({host: dhost, port: dport});
    // Set timeout koneksi (30 detik) untuk mencegah koneksi macet
    conn.setTimeout(30000, () => {
        conn.destroy();
        activeConnections.delete(conn);
    });
    activeConnections.add(conn);
    socket.on('data', function(data) {
        if (packetCount < packetsToSkip) {
            packetCount++;
        } else if (packetCount == packetsToSkip) {
            if (conn.writable) { // Periksa apakah koneksi masih valid
                conn.write(data, function(err) {
                    if(err) {
                        console.log("[EWRITE] Failed to write to external socket! - " + err);
                        conn.destroy();
                        activeConnections.delete(conn);
                    }
                });
                packetCount++;
            } else {
                conn.destroy();
                activeConnections.delete(conn);
            }
        } else {
            if (conn.writable) { // Periksa apakah koneksi masih valid
                conn.write(data);
            } else {
                conn.destroy();
                activeConnections.delete(conn);
            }
        }
    });
    conn.on('data', function(data) {
        socket.write(data, function(err) {
            if(err) {
                console.log("[SWRITE2] Failed to write response to " + socket.remoteAddress + ":" + socket.remotePort + ", error: " + err);
                socket.destroy();
            }
        });
    });
    socket.on('error', function(error) {
        console.log("[SOCKET] read " + error + " from " + socket.remoteAddress + ":" + socket.remotePort);
        conn.destroy();
        activeConnections.delete(conn);
        socket.destroy();
    });
    conn.on('error', function(error) {
        // Batasi logging kesalahan [REMOTE] untuk mengurangi I/O
        if (Date.now() - lastRemoteErrorLog > logInterval) {
            console.log("[REMOTE] read " + error);
            lastRemoteErrorLog = Date.now();
        }
        socket.destroy();
        conn.destroy();
        activeConnections.delete(conn);
    });
    socket.on('close', function() {
        conn.destroy();
        activeConnections.delete(conn);
        socket.destroy();
    });
    conn.on('close', function() {
        activeConnections.delete(conn);
    });
});
server.on("error", function(error) {
    console.log("[SRV] Error " + error + ", this may be unrecoverable");
});
server.on("close", function() {
    //koneksi ditutup entahlah, mungkin saya sebaiknya tidak menangkap ini
});
server.listen(mainPort, function(){
    console.log("[INFO] Server started on port: " + mainPort);
});
