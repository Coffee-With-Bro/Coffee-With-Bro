package com.coffeewithbro.coffee_with_bro.ml;

import java.util.Random;
import org.bytedeco.javacv.OpenCVFrameConverter;
import org.bytedeco.opencv.opencv_core.Mat;
import org.datavec.image.data.ImageWritable;
import org.datavec.image.transform.BaseImageTransform;
import static org.bytedeco.opencv.global.opencv_imgproc.*;

/** Java preprocessing only: weaken lighting/color shortcuts without changing sign geometry. */
public final class AppearanceTransform extends BaseImageTransform<Mat> {
    private final Mat adjusted = new Mat(), grayscale = new Mat();
    public AppearanceTransform(Random random) {
        super(random); converter = new OpenCVFrameConverter.ToMat();
    }
    @Override protected ImageWritable doTransform(ImageWritable image, Random supplied) {
        if (image == null) return null;
        Random rng = supplied == null ? random : supplied;
        Mat original = converter.convert(image.getFrame());
        original.convertTo(adjusted, -1, .75 + .5 * rng.nextDouble(), -20 + 40 * rng.nextDouble());
        if (rng.nextDouble() < .25) {
            cvtColor(adjusted, grayscale, COLOR_BGR2GRAY);
            cvtColor(grayscale, adjusted, COLOR_GRAY2BGR);
        }
        return new ImageWritable(converter.convert(adjusted));
    }
    @Override public float[] query(float... coordinates) { return coordinates; }
}
