import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import java.io.*;
import java.util.*;
import java.util.regex.*;
import javax.imageio.ImageIO;

/** Read-only dHash/thumbnail audit; fingerprints are candidates, not duplicate proof. */
public class ImageFingerprintAudit {
    public static void main(String[] args) throws Exception {
        ImageIO.setUseCache(false);
        Path manifests = Path.of(args[0]), output = Path.of(args[1]);
        Pattern name = Pattern.compile("(P\\d+)_([0-9A-Z])_(\\d+)\\.[^.]+");
        int count = 0;
        try (var writer = Files.newBufferedWriter(output)) {
            writer.write("split\tpath\tlabel\tsubject\tindex\tdhash\twidth\theight\tgray72\n");
            for (String split : List.of("train", "fine-tune", "validation", "test")) {
                List<String> lines = Files.readAllLines(manifests.resolve(split + ".tsv"));
                for (String line : lines.subList(1, lines.size())) {
                    String[] row = line.split("\t"); Path path = Path.of(row[0]);
                    Matcher match = name.matcher(path.getFileName().toString());
                    if (!match.matches()) throw new IOException("Unrecognized filename: " + path);
                    BufferedImage image = ImageIO.read(path.toFile());
                    if (image == null) throw new IOException("Unreadable image: " + path);
                    BufferedImage small = new BufferedImage(9, 8, BufferedImage.TYPE_BYTE_GRAY);
                    var graphics = small.createGraphics();
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
                    graphics.drawImage(image, 0, 0, 9, 8, null); graphics.dispose();
                    long hash = 0; byte[] gray = new byte[72];
                    for (int y = 0; y < 8; y++) for (int x = 0; x < 9; x++) {
                        int value = small.getRaster().getSample(x, y, 0); gray[y * 9 + x] = (byte)value;
                        if (x < 8 && value > small.getRaster().getSample(x + 1, y, 0)) hash |= 1L << (y * 8 + x);
                    }
                    writer.write(String.join("\t", split, row[0], row[1], match.group(1), match.group(3),
                            Long.toUnsignedString(hash, 16), Integer.toString(image.getWidth()), Integer.toString(image.getHeight()),
                            HexFormat.of().formatHex(gray)) + "\n");
                    if (++count % 5000 == 0) System.out.println("Fingerprinted " + count + " images");
                }
            }
        }
        System.out.println("Complete: " + count + " images; no source images modified");
    }
}
