var TreeCapitator;
(function (TreeCapitator) {
    var TreeData = [];
    var DirtTiles = {
        2: true,
        3: true,
        60: true
    };
    function getTreeData(block) {
        for (var i in TreeData) {
            var tree = TreeData[i];
            if (this.isTreeBlock(block, tree.log)) {
                return tree;
            }
        }
        return null;
    }
    TreeCapitator.getTreeData = getTreeData;
    function isTreeBlock(block, treeBlocks) {
        var id = block.id, data = block.data % 4;
        for (var i in treeBlocks) {
            block = treeBlocks[i];
            if (block[0] == id && (block[1] == -1 || block[1] == data)) {
                return true;
            }
        }
        return false;
    }
    TreeCapitator.isTreeBlock = isTreeBlock;
    function isDirtTile(blockID) {
        return DirtTiles[blockID] || false;
    }
    TreeCapitator.isDirtTile = isDirtTile;
    /** format
    [id, data] or [[id1, data1], [id2, data2], ...]
    use data -1 for all block variations
    */
    function registerTree(log, leaves, leavesRadius) {
        if (leavesRadius === void 0) { leavesRadius = 5; }
        if (typeof log[0] !== "object")
            log = [log];
        if (typeof leaves[0] !== "object")
            leaves = [leaves];
        TreeData.push({ log: log, leaves: leaves, radius: leavesRadius });
    }
    TreeCapitator.registerTree = registerTree;
    function registerDirtTile(blockID) {
        DirtTiles[blockID] = true;
    }
    TreeCapitator.registerDirtTile = registerDirtTile;
})(TreeCapitator || (TreeCapitator = {}));
TreeCapitator.registerTree([17, 0], [18, 0], 6);
TreeCapitator.registerTree([17, 1], [18, 1]);
TreeCapitator.registerTree([17, 2], [18, 2]);
TreeCapitator.registerTree([17, 3], [18, 3], 7);
TreeCapitator.registerTree([162, 0], [161, 0]);
TreeCapitator.registerTree([162, 1], [161, 1], 6);
ModAPI.registerAPI("TreeCapitator", TreeCapitator);
Callback.addCallback("LevelLoaded", function () {
    TreeCapitator.calculateDestroyTime = __config__.getBool("calculate_destroy_time");
});
var TreeLogger;
(function (TreeLogger) {
    var TreeDestroyData = /** @class */ (function () {
        function TreeDestroyData() {
            this.log = {};
            this.leaves = {};
            this.logCount = 0;
            this.hasLeaves = false;
        }
        return TreeDestroyData;
    }());
    var destroyData;
    function checkLog(region, x, y, z, tree) {
        destroyData.log[x + ':' + y + ':' + z] = true;
        destroyData.logCount++;
        for (var xx = x - 1; xx <= x + 1; xx++)
            for (var zz = z - 1; zz <= z + 1; zz++)
                for (var yy = y; yy <= y + 1; yy++) {
                    var block = region.getBlock(xx, yy, zz);
                    if (!destroyData.hasLeaves && TreeCapitator.isTreeBlock(block, tree.leaves)) {
                        destroyData.hasLeaves = true;
                    }
                    if (!destroyData.log[xx + ':' + yy + ':' + zz] && TreeCapitator.isTreeBlock(block, tree.log)) {
                        checkLog(region, xx, yy, zz, tree);
                    }
                }
    }
    function destroyLog(region, x, y, z, block, tree, toolLevel, enchant) {
        region.setBlock(x, y, z, 0, 0);
        //@ts-ignore
        var dropFunc = Block.dropFunctions[block.id];
        if (dropFunc) {
            var drop = dropFunc({ x: x, y: y, z: z }, block.id, block.data, toolLevel, enchant);
            for (var i in drop) {
                region.spawnDroppedItem(x, y, z, drop[i][0], drop[i][1], drop[i][2]);
            }
        }
        else {
            region.spawnDroppedItem(x, y, z, block.id, 1, block.data % 4);
        }
        checkLeavesFor6Sides(region, x, y, z, tree.leaves);
    }
    function destroyLeaves(region, x, y, z) {
        var block = region.getBlock(x, y, z);
        //@ts-ignore
        var dropFunc = Block.dropFunctions[block.id];
        if (dropFunc) {
            var enchant = ToolAPI.getEnchantExtraData();
            var item = { id: 0, count: 0, data: 0 };
            var drop = dropFunc({ x: x, y: y, z: z }, block.id, block.data, 0, enchant, item, region);
            for (var i in drop) {
                region.spawnDroppedItem(x, y, z, drop[i][0], drop[i][1], drop[i][2], drop[i][3] || null);
            }
        }
        else {
            if (block.id == 18) {
                if (block.data != 3 && Math.random() < 1 / 20 || block.data == 3 && Math.random() < 1 / 40) {
                    region.spawnDroppedItem(x, y, z, 6, 1, block.data);
                }
                if (block.data == 0 && Math.random() < 1 / 200) {
                    region.spawnDroppedItem(x, y, z, 260, 1, 0);
                }
            }
            if (block.id == 161 && Math.random() < 1 / 20) {
                region.spawnDroppedItem(x, y, z, 6, 1, block.data + 4);
            }
        }
        region.setBlock(x, y, z, 0, 0);
    }
    function checkLeaves(region, x, y, z, leaves) {
        if (TreeCapitator.isTreeBlock(region.getBlock(x, y, z), leaves)) {
            destroyData.leaves[x + ':' + y + ':' + z] = true;
        }
    }
    function checkLeavesFor6Sides(region, x, y, z, leaves) {
        checkLeaves(region, x - 1, y, z, leaves);
        checkLeaves(region, x + 1, y, z, leaves);
        checkLeaves(region, x, y, z - 1, leaves);
        checkLeaves(region, x, y, z + 1, leaves);
        checkLeaves(region, x, y - 1, z, leaves);
        checkLeaves(region, x, y + 1, z, leaves);
    }
    function isChoppingTree(player, region, coords, block) {
        var item = Entity.getCarriedItem(player);
        var tree = TreeCapitator.getTreeData(block);
        if (tree && !Entity.getSneaking(player) && ToolAPI.getToolLevelViaBlock(item.id, block.id)) {
            for (var y = coords.y; y > 0; y--) {
                var block_1 = region.getBlock(coords.x, y - 1, coords.z);
                if (TreeCapitator.isDirtTile(block_1.id)) {
                    return true;
                }
                if (!TreeCapitator.isTreeBlock(block_1, tree.log)) {
                    break;
                }
            }
        }
        return false;
    }
    function getTreeSize(region, coords, block) {
        var tree = TreeCapitator.getTreeData(block);
        destroyData = new TreeDestroyData();
        checkLog(region, coords.x, coords.y, coords.z, tree);
        if (destroyData.hasLeaves) {
            return destroyData.logCount;
        }
        return 0;
    }
    function convertCoords(coords) {
        var coordArray = coords.split(':');
        return {
            x: parseInt(coordArray[0]),
            y: parseInt(coordArray[1]),
            z: parseInt(coordArray[2])
        };
    }
    function startDestroy(coords, block, player) {
        var region = BlockSource.getDefaultForActor(player);
        if (region && TreeCapitator.calculateDestroyTime && isChoppingTree(player, region, coords, block)) {
            var treeSize = getTreeSize(region, coords, block);
            if (treeSize > 0) {
                var item = Entity.getCarriedItem(player);
                var destroyTime = ToolAPI.getDestroyTimeViaTool(block, item, coords);
                Block.setTempDestroyTime(block.id, destroyTime * treeSize);
            }
        }
    }
    TreeLogger.startDestroy = startDestroy;
    function onDestroy(coords, block, player) {
        var region = BlockSource.getDefaultForActor(player);
        if (isChoppingTree(player, region, coords, block) && getTreeSize(region, coords, block) > 0) {
            var item = Entity.getCarriedItem(player);
            var toolData = ToolAPI.getToolData(item.id);
            var toolLevel = ToolAPI.getToolLevelViaBlock(item.id, block.id);
            var enchant = ToolAPI.getEnchantExtraData(item.extra);
            var skipToolDamage = !toolData.isNative;
            if (toolData.modifyEnchant) {
                toolData.modifyEnchant(enchant, item);
            }
            var tree = TreeCapitator.getTreeData(block);
            for (var coordKey in destroyData.log) {
                var coords_1 = convertCoords(coordKey);
                block = region.getBlock(coords_1.x, coords_1.y, coords_1.z);
                destroyLog(region, coords_1.x, coords_1.y, coords_1.z, block, tree, toolLevel, enchant);
                if (!skipToolDamage && Game.isItemSpendingAllowed(player)) {
                    //@ts-ignore
                    if (!(toolData.onDestroy && toolData.onDestroy(item, coords_1, block)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
                        item.data++;
                        if (toolData.isWeapon) {
                            item.data++;
                        }
                    }
                    //@ts-ignore
                    if (item.data >= toolData.toolMaterial.durability) {
                        if (!(toolData.onBroke && toolData.onBroke(item))) {
                            item.id = toolData.brokenId;
                            item.count = 1;
                            item.data = 0;
                            World.playSoundAtEntity(player, "random.break", 1, 1);
                        }
                        break;
                    }
                }
                skipToolDamage = false;
            }
            Entity.setCarriedItem(player, item.id, item.count, item.data, item.extra);
            for (var i = 1; i <= tree.radius; i++) {
                var leavesToDestroy = destroyData.leaves;
                destroyData.leaves = {};
                for (var coordKey in leavesToDestroy) {
                    var coords_2 = convertCoords(coordKey);
                    destroyLeaves(region, coords_2.x, coords_2.y, coords_2.z);
                    if (i < tree.radius) {
                        checkLeavesFor6Sides(region, coords_2.x, coords_2.y, coords_2.z, tree.leaves);
                    }
                }
            }
        }
    }
    TreeLogger.onDestroy = onDestroy;
})(TreeLogger || (TreeLogger = {}));
Callback.addCallback("DestroyBlockStart", function (coords, block, player) {
    TreeLogger.startDestroy(coords, block, player);
});
Callback.addCallback("DestroyBlock", function (coords, block, player) {
    TreeLogger.onDestroy(coords, block, player);
});
