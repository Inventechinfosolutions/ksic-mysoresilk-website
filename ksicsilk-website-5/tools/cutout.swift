// Lift the subject out of each photo with macOS Vision and save it as a transparent PNG.
// Usage: swift tools/cutout.swift <out-dir> <image> [<image> ...]
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else {
    FileHandle.standardError.write("usage: cutout.swift <out-dir> <image>...\n".data(using: .utf8)!)
    exit(1)
}
let outDir = URL(fileURLWithPath: args[1], isDirectory: true)
try? FileManager.default.createDirectory(at: outDir, withIntermediateDirectories: true)
let context = CIContext()

for path in args.dropFirst(2) {
    let url = URL(fileURLWithPath: path)
    guard let input = CIImage(contentsOf: url) else { print("skip (unreadable) \(path)"); continue }
    let handler = VNImageRequestHandler(ciImage: input)
    let request = VNGenerateForegroundInstanceMaskRequest()
    do {
        try handler.perform([request])
        guard let obs = request.results?.first else { print("skip (no subject) \(path)"); continue }
        let buffer = try obs.generateMaskedImage(ofInstances: obs.allInstances, from: handler, croppedToInstancesExtent: false)
        let masked = CIImage(cvPixelBuffer: buffer)
        let name = url.deletingPathExtension().lastPathComponent + ".png"
        try context.writePNGRepresentation(of: masked, to: outDir.appendingPathComponent(name),
                                           format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
        print("ok \(name)")
    } catch {
        print("fail \(path): \(error)")
    }
}
