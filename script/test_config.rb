
dev = ARGV[0].to_i

if not File.exist?('src/config.js')
    exit(0)
end

if dev > 0
    key = "../config.dev.js"
else
    key = "../config.prod.js"
end

if not File.readlink("src/config.js") == key
    puts "delete config ..."
    File.delete("src/config.js")
end
