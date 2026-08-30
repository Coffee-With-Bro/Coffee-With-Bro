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
import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.deeplearning4j.nn.weights.WeightInit;
import org.nd4j.linalg.activations.Activation;
import org.nd4j.linalg.learning.config.Adam;
import org.nd4j.linalg.lossfunctions.LossFunctions;

public class AslCnnModel {

    private static final int CHANNELS = 3;
    private static final long SEED = 42;

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

                .setInputType(InputType.convolutionalFlat(imageSize, imageSize, CHANNELS))
                .build();

        return new MultiLayerNetwork(config);
    }
}