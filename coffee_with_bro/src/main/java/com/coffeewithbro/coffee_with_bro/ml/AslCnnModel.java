package com.coffeewithbro.coffee_with_bro.ml;

import org.deeplearning4j.nn.conf.MultiLayerConfiguration;
import org.deeplearning4j.nn.conf.NeuralNetConfiguration;
import org.deeplearning4j.nn.conf.inputs.InputType;
import org.deeplearning4j.nn.conf.layers.ActivationLayer;
import org.deeplearning4j.nn.conf.layers.BatchNormalization;
import org.deeplearning4j.nn.conf.layers.ConvolutionLayer;
import org.deeplearning4j.nn.conf.layers.DenseLayer;
import org.deeplearning4j.nn.conf.layers.OutputLayer;
import org.deeplearning4j.nn.conf.layers.SubsamplingLayer;
import org.deeplearning4j.nn.conf.layers.GlobalPoolingLayer;
import org.deeplearning4j.nn.conf.layers.PoolingType;
import org.deeplearning4j.nn.conf.GradientNormalization;
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.nn.weights.WeightInit;
import org.nd4j.linalg.activations.Activation;
import org.nd4j.linalg.learning.config.Adam;
import org.nd4j.linalg.lossfunctions.LossFunctions;

public class AslCnnModel {

    private static final int CHANNELS = 3;
    private static final long SEED = 42;

    /** Compact candidate, trained from fresh weights on acquisition-group holdouts. */
    public static MultiLayerNetwork buildCompact(int imageSize, int numClasses) {
        return buildCandidate(imageSize, numClasses, false);
    }

    public static MultiLayerNetwork buildSpatial(int imageSize, int numClasses) {
        return buildCandidate(imageSize, numClasses, true);
    }

    private static MultiLayerNetwork buildCandidate(int imageSize, int numClasses, boolean spatial) {
        var builder = new NeuralNetConfiguration.Builder()
                .seed(SEED).weightInit(WeightInit.RELU).updater(new Adam(.001))
                .l2(.0001).gradientNormalization(GradientNormalization.ClipElementWiseAbsoluteValue)
                .gradientNormalizationThreshold(5).list();
        for (int channels : new int[]{32, 64, 128}) {
            var conv = new ConvolutionLayer.Builder(3, 3).nOut(channels)
                    .stride(1, 1).padding(1, 1).activation(Activation.IDENTITY);
            if (channels == 32) conv.nIn(CHANNELS);
            builder.layer(conv.build())
                    .layer(new BatchNormalization.Builder().build())
                    .layer(new ActivationLayer.Builder().activation(Activation.RELU).build())
                    .layer(new SubsamplingLayer.Builder(SubsamplingLayer.PoolingType.MAX)
                            .kernelSize(2, 2).stride(2, 2).build());
        }
        if (spatial) builder.layer(new SubsamplingLayer.Builder(SubsamplingLayer.PoolingType.AVG)
                .kernelSize(4, 4).stride(4, 4).build());
        else builder.layer(new GlobalPoolingLayer.Builder().poolingType(PoolingType.AVG).build());
        var config = builder.layer(new DenseLayer.Builder().nOut(spatial ? 128 : 64)
                        .activation(Activation.RELU).dropOut(spatial ? .6 : .8).build())
                .layer(new OutputLayer.Builder(LossFunctions.LossFunction.NEGATIVELOGLIKELIHOOD)
                        .nOut(numClasses).activation(Activation.SOFTMAX).build())
                .setInputType(InputType.convolutional(imageSize, imageSize, CHANNELS)).build();
        return new MultiLayerNetwork(config);
    }

    public static MultiLayerNetwork build(int imageSize, int numClasses) {
        MultiLayerConfiguration config = new NeuralNetConfiguration.Builder()
                .seed(SEED)
                .weightInit(WeightInit.XAVIER)
                .updater(new Adam(0.001))
                .list()

                .layer(new ConvolutionLayer.Builder(3, 3)
                        .nIn(CHANNELS).nOut(32)
                        .stride(1, 1).padding(1, 1)
                        .build())
                .layer(new BatchNormalization.Builder().build())
                .layer(new ActivationLayer.Builder().activation(Activation.RELU).build())
                .layer(new SubsamplingLayer.Builder(SubsamplingLayer.PoolingType.MAX)
                        .kernelSize(2, 2).stride(2, 2).build())

                .layer(new ConvolutionLayer.Builder(3, 3)
                        .nOut(64)
                        .stride(1, 1).padding(1, 1)
                        .build())
                .layer(new BatchNormalization.Builder().build())
                .layer(new ActivationLayer.Builder().activation(Activation.RELU).build())
                .layer(new SubsamplingLayer.Builder(SubsamplingLayer.PoolingType.MAX)
                        .kernelSize(2, 2).stride(2, 2).build())

                .layer(new ConvolutionLayer.Builder(3, 3)
                        .nOut(128)
                        .stride(1, 1).padding(1, 1)
                        .build())
                .layer(new BatchNormalization.Builder().build())
                .layer(new ActivationLayer.Builder().activation(Activation.RELU).build())
                .layer(new SubsamplingLayer.Builder(SubsamplingLayer.PoolingType.MAX)
                        .kernelSize(2, 2).stride(2, 2).build())

                .layer(new DenseLayer.Builder()
                        .nOut(256)
                        .activation(Activation.RELU)
                        .dropOut(0.6)
                        .build())
                .layer(new OutputLayer.Builder(LossFunctions.LossFunction.NEGATIVELOGLIKELIHOOD)
                        .nOut(numClasses)
                        .activation(Activation.SOFTMAX)
                        .build())

                .setInputType(InputType.convolutional(imageSize, imageSize, CHANNELS))
                .build();

        return new MultiLayerNetwork(config);
    }
}
