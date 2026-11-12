package com.coffeewithbro.coffee_with_bro.ml;

import java.io.File;
import java.util.Random;
import org.datavec.api.io.labels.ParentPathLabelGenerator;
import org.datavec.api.split.FileSplit;
import org.datavec.image.loader.NativeImageLoader;
import org.datavec.image.recordreader.ImageRecordReader;

public class LabelCheck {
    public static void main(String[] args) throws Exception {
        File dataDir = new File("../ice_with_bro/Data/Processed/Train");
        ParentPathLabelGenerator labelMaker = new ParentPathLabelGenerator();
        FileSplit fileSplit = new FileSplit(dataDir, NativeImageLoader.ALLOWED_FORMATS, new Random(42));
        ImageRecordReader recordReader = new ImageRecordReader(128, 128, 3, labelMaker);
        recordReader.initialize(fileSplit);
        System.out.println("RecordReader Labels: " + recordReader.getLabels());
    }
}

