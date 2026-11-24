#import <Cocoa/Cocoa.h>
#import <sys/socket.h>
#import <netinet/in.h>
#import <unistd.h>
#import <fcntl.h>
#import <sys/stat.h>
#import <signal.h>

static BOOL sendAll(int socket, const void *bytes, size_t size) {
    const char *p = bytes;
    while (size) { ssize_t n = send(socket, p, size, 0); if (n <= 0) return NO; p += n; size -= n; }
    return YES;
}
static void serveClient(int client, NSString *root) {
    @autoreleasepool {
        int yes = 1; setsockopt(client, SOL_SOCKET, SO_NOSIGPIPE, &yes, sizeof(yes));
        struct timeval timeout = {30, 0}; setsockopt(client, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
        NSMutableData *request = [NSMutableData data]; char buffer[4096];
        while (request.length < 32768) {
            ssize_t n = recv(client, buffer, sizeof(buffer), 0); if (n <= 0) { close(client); return; }
            [request appendBytes:buffer length:(NSUInteger)n];
            NSData *end = [@"\r\n\r\n" dataUsingEncoding:NSUTF8StringEncoding];
            if ([request rangeOfData:end options:0 range:NSMakeRange(0, request.length)].location != NSNotFound) break;
        }
        NSString *text = [[NSString alloc] initWithData:request encoding:NSUTF8StringEncoding];
        NSArray<NSString *> *words = [[[text componentsSeparatedByString:@"\r\n"] firstObject] componentsSeparatedByString:@" "];
        if (words.count < 2 || (! [words[0] isEqualToString:@"GET"] && ! [words[0] isEqualToString:@"HEAD"])) { close(client); return; }
        NSString *path = [[words[1] componentsSeparatedByString:@"?"] firstObject].stringByRemovingPercentEncoding;
        if ([path isEqualToString:@"/"]) path = @"index.html";
        while ([path hasPrefix:@"/"]) path = [path substringFromIndex:1];
        NSString *file = [[[root stringByAppendingPathComponent:path ?: @""] stringByStandardizingPath] stringByResolvingSymlinksInPath];
        int fd = -1; struct stat info;
        if ([file hasPrefix:[root stringByAppendingString:@"/"]]) fd = open(file.fileSystemRepresentation, O_RDONLY);
        if (fd < 0 || fstat(fd, &info) != 0 || !S_ISREG(info.st_mode)) {
            const char *response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            sendAll(client, response, strlen(response)); if (fd >= 0) close(fd); close(client); return;
        }
        NSDictionary *types = @{@"html":@"text/html; charset=utf-8", @"js":@"text/javascript", @"css":@"text/css", @"json":@"application/json", @"glb":@"model/gltf-binary", @"gltf":@"model/gltf+json", @"bin":@"application/octet-stream", @"png":@"image/png", @"jpg":@"image/jpeg", @"jpeg":@"image/jpeg", @"webp":@"image/webp", @"wav":@"audio/wav", @"mp3":@"audio/mpeg"};
        NSString *type = types[file.pathExtension.lowercaseString] ?: @"application/octet-stream";
        NSString *header = [NSString stringWithFormat:@"HTTP/1.1 200 OK\r\nContent-Type: %@\r\nContent-Length: %lld\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n", type, (long long)info.st_size];
        NSData *headerData = [header dataUsingEncoding:NSUTF8StringEncoding];
        BOOL alive = sendAll(client, headerData.bytes, headerData.length);
        if (alive && ![words[0] isEqualToString:@"HEAD"]) {
            char *chunk = malloc(262144); ssize_t n;
            while ((n = read(fd, chunk, 262144)) > 0) if (!sendAll(client, chunk, (size_t)n)) break;
            free(chunk);
        }
        close(fd); close(client);
    }
}
@interface SchoolWalkDelegate : NSObject <NSApplicationDelegate>
@property(strong) NSStatusItem *statusItem;
@property(strong) NSURL *address;
@property int listener;
@end
@implementation SchoolWalkDelegate
- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    NSString *root = [[NSBundle.mainBundle.resourcePath stringByAppendingPathComponent:@"Web"] stringByResolvingSymlinksInPath];
    if (![NSFileManager.defaultManager fileExistsAtPath:[root stringByAppendingPathComponent:@"index.html"]]) { [self fail:@"앱 안의 학교 웹 파일을 찾을 수 없습니다. 앱 전체를 함께 복사해 주세요."]; return; }
    self.statusItem = [NSStatusBar.systemStatusBar statusItemWithLength:NSVariableStatusItemLength];
    self.statusItem.button.title = @"학교 탐색";
    NSMenu *menu = [[NSMenu alloc] init];
    NSMenuItem *openItem = [[NSMenuItem alloc] initWithTitle:@"학교 탐색 화면 열기" action:@selector(openPage:) keyEquivalent:@"o"]; openItem.target = self; [menu addItem:openItem];
    [menu addItem:NSMenuItem.separatorItem];
    NSMenuItem *quitItem = [[NSMenuItem alloc] initWithTitle:@"학교 탐색 종료" action:@selector(quit:) keyEquivalent:@"q"]; quitItem.target = self; [menu addItem:quitItem]; self.statusItem.menu = menu;
    int listener = socket(AF_INET, SOCK_STREAM, 0); self.listener = listener;
    struct sockaddr_in endpoint = {0}; endpoint.sin_family = AF_INET; endpoint.sin_addr.s_addr = htonl(INADDR_LOOPBACK); endpoint.sin_port = 0;
    if (listener < 0 || bind(listener, (struct sockaddr *)&endpoint, sizeof(endpoint)) != 0 || listen(listener, 32) != 0) { [self fail:@"학교 탐색 서버를 시작하지 못했습니다."]; return; }
    socklen_t length = sizeof(endpoint); getsockname(listener, (struct sockaddr *)&endpoint, &length);
    self.address = [NSURL URLWithString:[NSString stringWithFormat:@"http://127.0.0.1:%d/", ntohs(endpoint.sin_port)]];
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
        while (1) { int client = accept(listener, NULL, NULL); if (client < 0) break;
            dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{ serveClient(client, root); });
        }
    });
    [self openPage:nil];
}
- (void)openPage:(id)sender { if (self.address) [NSWorkspace.sharedWorkspace openURL:self.address]; }
- (BOOL)applicationShouldHandleReopen:(NSApplication *)sender hasVisibleWindows:(BOOL)flag { [self openPage:nil]; return NO; }
- (void)quit:(id)sender { if (self.listener >= 0) close(self.listener); [NSApp terminate:nil]; }
- (void)fail:(NSString *)message { NSAlert *alert = [[NSAlert alloc] init]; alert.messageText = @"학교 탐색"; alert.informativeText = message; [alert runModal]; [NSApp terminate:nil]; }
@end
int main(int argc, const char **argv) {
    @autoreleasepool { NSApplication *app = NSApplication.sharedApplication; SchoolWalkDelegate *delegate = [[SchoolWalkDelegate alloc] init]; app.delegate = delegate; [app setActivationPolicy:NSApplicationActivationPolicyAccessory]; [app run]; }
    return 0;
}
