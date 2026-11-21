package com.coffeewithbro.coffee_with_bro.ml;

import org.deeplearning4j.nn.multilayer.MultiLayerNetwork;
import org.nd4j.linalg.api.memory.conf.WorkspaceConfiguration;
import org.nd4j.linalg.api.memory.enums.*;

/** Fixed ND4J workspaces. Does not claim to replace cuDNN/LibND4J's native allocators. */
public final class FixedWorkspaceNetwork extends MultiLayerNetwork {
    public FixedWorkspaceNetwork(MultiLayerNetwork architecture) {
        super(architecture.getLayerWiseConfigurations());
        freeze(WS_ALL_LAYERS_ACT_CONFIG, 512L << 20);
        freeze(WS_LAYER_WORKING_MEM_CONFIG, 256L << 20);
        freeze(WS_LAYER_ACT_X_CONFIG, 256L << 20);
        freeze(WS_RNN_LOOP_WORKING_MEM_CONFIG, 16L << 20);
    }

    public static WorkspaceConfiguration fixed(long bytes) {
        var result = WorkspaceConfiguration.builder().build();
        freeze(result, bytes);
        return result;
    }

    public static void lock(MultiLayerNetwork model) throws ReflectiveOperationException {
        lock(model, new long[]{512L << 20, 256L << 20, 256L << 20, 16L << 20});
    }

    public static void lockInference(MultiLayerNetwork model) throws ReflectiveOperationException {
        // Only instance configurations: inference must not shrink the shared training workspace.
        String[] fields = {"WS_LAYER_WORKING_MEM_CONFIG", "WS_LAYER_ACT_X_CONFIG"};
        long[] sizes = {64L << 20, 16L << 20};
        for (int i = 0; i < fields.length; i++) {
            var field = MultiLayerNetwork.class.getDeclaredField(fields[i]);
            field.setAccessible(true);
            freeze((WorkspaceConfiguration) field.get(model), sizes[i]);
        }
    }

    private static void lock(MultiLayerNetwork model, long[] sizes) throws ReflectiveOperationException {
        String[] fields = {"WS_ALL_LAYERS_ACT_CONFIG", "WS_LAYER_WORKING_MEM_CONFIG", "WS_LAYER_ACT_X_CONFIG", "WS_RNN_LOOP_WORKING_MEM_CONFIG"};
        for (int i = 0; i < fields.length; i++) {
            var field = MultiLayerNetwork.class.getDeclaredField(fields[i]);
            field.setAccessible(true);
            freeze((WorkspaceConfiguration) field.get(model), sizes[i]);
        }
    }

    private static void freeze(WorkspaceConfiguration config, long bytes) {
        config.setInitialSize(bytes);
        config.setMinSize(bytes);
        config.setMaxSize(bytes);
        config.setOverallocationLimit(0);
        config.setPolicyLearning(LearningPolicy.NONE);
        config.setPolicyAllocation(AllocationPolicy.STRICT);
        config.setPolicySpill(SpillPolicy.FAIL);
    }
}
