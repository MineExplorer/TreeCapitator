class VanillaTreeLogger extends TreeLogger {
	destroyLeaves(): void {
		const emptyItem = {id: 0, count: 0, data: 0};
		const passedMap = {};
		for (let iteration = 1; iteration <= this.leavesDestroyRadius && this.nextLeaves.length > 0; iteration++) {
			const leavesToDestroy = this.nextLeaves;
			this.nextLeaves = [];
			for (let coords of leavesToDestroy) {
				const block = this.region.getBlock(coords.x, coords.y, coords.z);
				this.destroyBlock(coords.x, coords.y, coords.z, block, emptyItem);
			}
			if (iteration < this.leavesDestroyRadius) {
				for (let coords of leavesToDestroy) {
					this.checkLeavesFor6Sides(coords.x, coords.y, coords.z, passedMap);
				}
			}
		}
	}
}