var GAME_VERSION = getMCPEVersion().array[1];
var NEW_CORE_API = GAME_VERSION >= 16;
var TreeCapitator;
(function (TreeCapitator) {
    var treeData = [];
    var dirtTiles = {
        2: true,
        3: true,
        60: true, //farmland
    };
    dirtTiles[VanillaTileID.crimson_nylium] = true;
    dirtTiles[VanillaTileID.warped_nylium] = true;
    TreeCapitator.calculateDestroyTime = __config__.getBool("increase_tree_destroy_time");
    function getTreeData(block) {
        for (var i in treeData) {
            var tree = treeData[i];
            if (this.isTreeBlock(block, tree.log)) {
                return tree;
            }
        }
        return null;
    }
    TreeCapitator.getTreeData = getTreeData;
    function isTreeBlock(block, treeBlocks) {
        var id = block.id, data = block.data % 4;
        for (var _i = 0, treeBlocks_1 = treeBlocks; _i < treeBlocks_1.length; _i++) {
            var tile = treeBlocks_1[_i];
            if (tile[0] == id && (tile[1] == -1 || tile[1] == data)) {
                return true;
            }
        }
        return false;
    }
    TreeCapitator.isTreeBlock = isTreeBlock;
    /**
     * @param blockID block numeric id
     * @returns true if trees can grow on this tile, false otherwise
     */
    function isDirtTile(blockID) {
        return dirtTiles[blockID] || false;
    }
    TreeCapitator.isDirtTile = isDirtTile;
    function registerTree(log, leaves, leavesRadius) {
        if (leavesRadius === void 0) { leavesRadius = 5; }
        if (typeof log[0] !== "object")
            log = [log];
        if (typeof leaves[0] !== "object")
            leaves = [leaves];
        treeData.push({ log: log, leaves: leaves, radius: leavesRadius });
    }
    TreeCapitator.registerTree = registerTree;
    /**
     * Registers block as a valid tree ground.
     */
    function registerDirtTile(blockID) {
        dirtTiles[blockID] = true;
    }
    TreeCapitator.registerDirtTile = registerDirtTile;
})(TreeCapitator || (TreeCapitator = {}));
TreeCapitator.registerTree([17, 0], [18, 0], 6); // oak
TreeCapitator.registerTree([17, 1], [18, 1], 5); // spruce
TreeCapitator.registerTree([17, 2], [18, 2], 5); // birch
TreeCapitator.registerTree([17, 3], [18, 3], 7); // jungle
TreeCapitator.registerTree([162, 0], [161, 0], 5); // acacia
TreeCapitator.registerTree([162, 1], [161, 1], 6); // dark oak
if (GAME_VERSION >= 16) {
    TreeCapitator.registerTree([VanillaTileID.crimson_hyphae, 1], [VanillaTileID.nether_wart_block, 1], 6);
    TreeCapitator.registerTree([VanillaTileID.warped_hyphae, 1], [VanillaTileID.warped_wart_block, 1], 6);
}
ModAPI.registerAPI("TreeCapitator", TreeCapitator);
var TreeLogger = /** @class */ (function () {
    function TreeLogger(treeData, playerUid, isLocal) {
        this.logMap = {};
        this.leavesMap = {};
        this.logCount = 0;
        this.hasLeaves = false;
        this.tree = treeData;
        this.player = playerUid;
        this.region = isLocal ?
            BlockSource.getCurrentClientRegion() :
            BlockSource.getDefaultForActor(playerUid);
    }
    TreeLogger.prototype.checkLog = function (x, y, z, tree) {
        this.logMap[x + ':' + y + ':' + z] = true;
        this.logCount++;
        for (var xx = x - 1; xx <= x + 1; xx++)
            for (var zz = z - 1; zz <= z + 1; zz++)
                for (var yy = y; yy <= y + 1; yy++) {
                    var block = this.region.getBlock(xx, yy, zz);
                    if (!this.hasLeaves && TreeCapitator.isTreeBlock(block, tree.leaves)) {
                        this.hasLeaves = true;
                    }
                    if (!this.logMap[xx + ':' + yy + ':' + zz] && TreeCapitator.isTreeBlock(block, tree.log)) {
                        this.checkLog(xx, yy, zz, tree);
                    }
                }
    };
    TreeLogger.prototype.destroyBlock = function (x, y, z, block, tool, enchant) {
        if (tool === void 0) { tool = { id: 0, count: 0, data: 0 }; }
        // buggy bullshit
        /*if (NEW_CORE_API) {
            //@ts-ignore
            const drop = this.region.breakBlockForJsResult(x, y, z, tool);
            for (let item of drop.items) {
                //Game.message(`item: ${item.id}, ${item.count}, ${item.data}`)
                this.region.spawnDroppedItem(x, y, z, item.id, item.count, item.data, item.extra || null);
            }
        }*/
        this.destroyBlockLegacy(x, y, z, block, tool, enchant);
    };
    TreeLogger.prototype.destroyBlockLegacy = function (x, y, z, block, item, enchant) {
        if (item === void 0) { item = { id: 0, count: 0, data: 0 }; }
        this.region.setBlock(x, y, z, 0, 0);
        var dropFunc = Block.dropFunctions[block.id];
        if (dropFunc) {
            enchant = enchant || ToolAPI.getEnchantExtraData();
            var drop = dropFunc({ x: x, y: y, z: z }, block.id, block.data, ToolAPI.getToolLevel(item.id), enchant, item, this.region);
            for (var _i = 0, drop_1 = drop; _i < drop_1.length; _i++) {
                var item_1 = drop_1[_i];
                this.region.spawnDroppedItem(x, y, z, item_1[0], item_1[1], item_1[2], item_1[3] || null);
            }
        }
        else {
            this.getVanillaDrop(x, y, z, block);
        }
    };
    TreeLogger.prototype.getVanillaDrop = function (x, y, z, block) {
        var id = block.id, data = block.data;
        if (id == 17 || id == 161) {
            this.region.spawnDroppedItem(x, y, z, id, 1, data);
        }
        if (id == 18) {
            if (data != 3 && Math.random() < 1 / 20 || data == 3 && Math.random() < 1 / 40) {
                this.region.spawnDroppedItem(x, y, z, 6, 1, data);
            }
            if (data == 0 && Math.random() < 1 / 200) {
                this.region.spawnDroppedItem(x, y, z, 260, 1, 0);
            }
        }
        if (id == 161 && Math.random() < 1 / 20) {
            this.region.spawnDroppedItem(x, y, z, 6, 1, data + 4);
        }
        if (Math.random() < 1 / 50) {
            this.region.spawnDroppedItem(x, y, z, 280, 1, 0);
        }
    };
    TreeLogger.prototype.checkLeaves = function (x, y, z) {
        var key = x + ':' + y + ':' + z;
        if (!this.leavesMap[key] && TreeCapitator.isTreeBlock(this.region.getBlock(x, y, z), this.tree.leaves)) {
            this.leavesMap[key] = true;
        }
    };
    TreeLogger.prototype.checkLeavesFor6Sides = function (x, y, z) {
        this.checkLeaves(x - 1, y, z);
        this.checkLeaves(x + 1, y, z);
        this.checkLeaves(x, y, z - 1);
        this.checkLeaves(x, y, z + 1);
        this.checkLeaves(x, y - 1, z);
        this.checkLeaves(x, y + 1, z);
    };
    TreeLogger.prototype.isChoppingTree = function (coords, block, item) {
        if (!Entity.getSneaking(this.player) && ToolAPI.getToolLevelViaBlock(item.id, block.id) > 0) {
            for (var y = coords.y; y > 0; y--) {
                var block_1 = this.region.getBlock(coords.x, y - 1, coords.z);
                if (TreeCapitator.isDirtTile(block_1.id)) {
                    return true;
                }
                if (!TreeCapitator.isTreeBlock(block_1, this.tree.log)) {
                    break;
                }
            }
        }
        return false;
    };
    TreeLogger.prototype.getTreeSize = function (coords, block) {
        var tree = TreeCapitator.getTreeData(block);
        this.checkLog(coords.x, coords.y, coords.z, tree);
        if (this.hasLeaves) {
            return this.logCount;
        }
        return 0;
    };
    TreeLogger.prototype.convertCoords = function (coords) {
        var coordArray = coords.split(':');
        return {
            x: parseInt(coordArray[0]),
            y: parseInt(coordArray[1]),
            z: parseInt(coordArray[2])
        };
    };
    TreeLogger.prototype.setDestroyTime = function (coords, block) {
        var item = Entity.getCarriedItem(this.player);
        if (this.isChoppingTree(coords, block, item)) {
            var treeSize = this.getTreeSize(coords, block);
            Game.message("Tree size: " + treeSize);
            if (treeSize > 0) {
                var destroyTime = ToolAPI.getDestroyTimeViaTool(block, item, coords);
                Block.setTempDestroyTime(block.id, destroyTime * treeSize);
            }
        }
    };
    TreeLogger.prototype.destroyTree = function (coords, block) {
        var item = Entity.getCarriedItem(this.player);
        if (this.isChoppingTree(coords, block, item) && this.getTreeSize(coords, block) > 0) {
            //if (NEW_CORE_API) this.region.setDestroyParticlesEnabled(false);
            var toolData = ToolAPI.getToolData(item.id);
            var enchant = ToolAPI.getEnchantExtraData(item.extra);
            if (toolData.modifyEnchant) {
                toolData.modifyEnchant(enchant, item);
            }
            this.destroyLogs(item, toolData, enchant);
            this.destroyLeaves();
        }
    };
    TreeLogger.prototype.destroyLogs = function (item, toolData, enchant) {
        var skipToolDamage = !toolData.isNative;
        for (var coordKey in this.logMap) {
            var coords = this.convertCoords(coordKey);
            var block = this.region.getBlock(coords.x, coords.y, coords.z);
            this.destroyBlock(coords.x, coords.y, coords.z, block, item, enchant);
            this.checkLeavesFor6Sides(coords.x, coords.y, coords.z);
            if (!skipToolDamage && Game.isItemSpendingAllowed(this.player)) {
                if (!(toolData.onDestroy && toolData.onDestroy(item, coords, block, this.player)) && Math.random() < 1 / (enchant.unbreaking + 1)) {
                    item.data++;
                    if (toolData.isWeapon) {
                        item.data++;
                    }
                }
                if (item.data >= toolData.toolMaterial.durability) {
                    if (!(toolData.onBroke && toolData.onBroke(item))) {
                        item.id = toolData.brokenId;
                        item.count = 1;
                        item.data = 0;
                        World.playSoundAtEntity(this.player, "random.break", 1, 1);
                    }
                    break;
                }
            }
            skipToolDamage = false;
        }
        Entity.setCarriedItem(this.player, item.id, item.count, item.data, item.extra);
    };
    TreeLogger.prototype.destroyLeaves = function () {
        for (var i = 1; i <= this.tree.radius; i++) {
            var leavesToDestroy = this.leavesMap;
            this.leavesMap = {};
            for (var coordKey in leavesToDestroy) {
                var coords = this.convertCoords(coordKey);
                var block = this.region.getBlock(coords.x, coords.y, coords.z);
                this.destroyBlock(coords.x, coords.y, coords.z, block);
            }
            if (i < this.tree.radius) {
                for (var coordKey in leavesToDestroy) {
                    var coords = this.convertCoords(coordKey);
                    this.checkLeavesFor6Sides(coords.x, coords.y, coords.z);
                }
            }
        }
    };
    TreeLogger.onStartDestroy = function (coords, block, player) {
        var tree = TreeCapitator.getTreeData(block);
        if (tree) {
            var treeLogger = new TreeLogger(tree, player, Network.inRemoteWorld());
            treeLogger.setDestroyTime(coords, block);
        }
    };
    TreeLogger.onDestroy = function (coords, block, player) {
        var tree = TreeCapitator.getTreeData(block);
        if (tree) {
            var treeLogger = new TreeLogger(tree, player, false);
            treeLogger.destroyTree(coords, block);
        }
    };
    return TreeLogger;
}());
Callback.addCallback("DestroyBlockStart", function (coords, block, player) {
    if (TreeCapitator.calculateDestroyTime) {
        TreeLogger.onStartDestroy(coords, block, player);
    }
});
Callback.addCallback("DestroyBlock", function (coords, block, player) {
    TreeLogger.onDestroy(coords, block, player);
});
