// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SupplyChain {
    // Smart contract owner can authorize roles and manage critical inventory adjustments.
    address public Owner;

    constructor() {
        Owner = msg.sender;
    }

    modifier onlyByOwner() {
        require(msg.sender == Owner, "Only owner");
        _;
    }

    modifier validProduct(uint256 _productID) {
        require(_productID > 0 && _productID <= productCtr, "Invalid product id");
        _;
    }

    modifier validBatch(uint256 _batchID) {
        require(_batchID > 0 && _batchID <= batchCtr && BatchStock[_batchID].exists, "Invalid batch id");
        _;
    }

    modifier onlyAuthorizedOperator() {
        require(msg.sender == Owner || _isRegisteredParticipant(msg.sender), "Not authorized");
        _;
    }

    // Stages of a product in the supply chain.
    enum STAGE {
        Init,
        RawMaterialSupply,
        Manufacture,
        Distribution,
        Retail,
        sold
    }

    // Inventory transaction types.
    enum InventoryAction {
        Receive,
        Issue,
        Transfer,
        Adjust
    }

    // Counters.
    uint256 public productCtr = 0;
    uint256 public rmsCtr = 0;
    uint256 public manCtr = 0;
    uint256 public disCtr = 0;
    uint256 public retCtr = 0;
    uint256 public batchCtr = 0;
    uint256 public inventoryTxCtr = 0;

    // Core product record.
    struct product {
        uint256 id;
        string name;
        string description;
        uint256 RMSid;
        uint256 MANid;
        uint256 DISid;
        uint256 RETid;
        STAGE stage;
    }

    // Batch/lot metadata and totals.
    struct batchInfo {
        uint256 id;
        uint256 productId;
        string batchNumber;
        string supplierBatchRef;
        uint256 mfgDate;
        uint256 expiryDate;
        uint256 totalReceived;
        uint256 totalIssued;
        uint256 createdAt;
        bool exists;
    }

    // Immutable-style inventory transaction record.
    struct inventoryTransaction {
        uint256 id;
        uint256 productId;
        uint256 batchId;
        InventoryAction action;
        uint256 quantity;
        address fromAddr;
        address toAddr;
        int256 signedDelta;
        string refNote;
        uint256 timestamp;
    }

    // To store information about raw material supplier.
    struct rawMaterialSupplier {
        address addr;
        uint256 id;
        string name;
        string place;
    }

    // To store information about manufacturer.
    struct manufacturer {
        address addr;
        uint256 id;
        string name;
        string place;
    }

    // To store information about distributor.
    struct distributor {
        address addr;
        uint256 id;
        string name;
        string place;
    }

    // To store information about retailer.
    struct retailer {
        address addr;
        uint256 id;
        string name;
        string place;
    }

    // Primary storage.
    mapping(uint256 => product) public ProductStock;
    mapping(uint256 => rawMaterialSupplier) public RMS;
    mapping(uint256 => manufacturer) public MAN;
    mapping(uint256 => distributor) public DIS;
    mapping(uint256 => retailer) public RET;

    mapping(uint256 => batchInfo) public BatchStock;
    mapping(uint256 => inventoryTransaction) public InventoryTx;

    // Product total inventory (all holders combined).
    mapping(uint256 => uint256) public productInventory;
    // Batch quantity per holder (warehouse/account based address).
    mapping(uint256 => mapping(address => uint256)) public batchBalanceByHolder;
    // Batch ids linked to product id.
    mapping(uint256 => uint256[]) private productBatchIds;
    
    // Order + tracking timestamps for each product.
    mapping(uint256 => uint256) public productCreatedAt;
    mapping(uint256 => uint256) public productLastUpdatedAt;
    mapping(uint256 => mapping(uint8 => uint256)) public productStageAt;

    event ProductOrdered(
        uint256 indexed productId,
        string name,
        uint256 timestamp,
        address indexed actor
    );
    
    event ProductStageUpdated(
        uint256 indexed productId,
        uint8 fromStage,
        uint8 toStage,
        uint256 timestamp,
        address indexed actor
    );

    event BatchCreated(
        uint256 indexed batchId,
        uint256 indexed productId,
        string batchNumber,
        string supplierBatchRef,
        uint256 mfgDate,
        uint256 expiryDate,
        uint256 createdAt
    );

    event InventoryChanged(
        uint256 indexed txId,
        uint256 indexed productId,
        uint256 indexed batchId,
        InventoryAction action,
        uint256 quantity,
        int256 signedDelta,
        address fromAddr,
        address toAddr,
        string refNote,
        uint256 timestamp
    );

    function showStage(uint256 _productID)
        public
        view
        validProduct(_productID)
        returns (string memory)
    {
        if (ProductStock[_productID].stage == STAGE.Init)
            return "Product Ordered";
        else if (ProductStock[_productID].stage == STAGE.RawMaterialSupply)
            return "Raw Material Supply Stage";
        else if (ProductStock[_productID].stage == STAGE.Manufacture)
            return "Manufacturing Stage";
        else if (ProductStock[_productID].stage == STAGE.Distribution)
            return "Distribution Stage";
        else if (ProductStock[_productID].stage == STAGE.Retail)
            return "Retail Stage";
        else if (ProductStock[_productID].stage == STAGE.sold)
            return "Product Sold";

        revert("Unknown stage");
    }

    function addRMS(
        address _address,
        string memory _name,
        string memory _place
    ) public onlyByOwner() {
        require(_address != address(0), "Invalid RMS address");
        rmsCtr++;
        RMS[rmsCtr] = rawMaterialSupplier(_address, rmsCtr, _name, _place);
    }

    function addManufacturer(
        address _address,
        string memory _name,
        string memory _place
    ) public onlyByOwner() {
        require(_address != address(0), "Invalid manufacturer address");
        manCtr++;
        MAN[manCtr] = manufacturer(_address, manCtr, _name, _place);
    }

    function addDistributor(
        address _address,
        string memory _name,
        string memory _place
    ) public onlyByOwner() {
        require(_address != address(0), "Invalid distributor address");
        disCtr++;
        DIS[disCtr] = distributor(_address, disCtr, _name, _place);
    }

    function addRetailer(
        address _address,
        string memory _name,
        string memory _place
    ) public onlyByOwner() {
        require(_address != address(0), "Invalid retailer address");
        retCtr++;
        RET[retCtr] = retailer(_address, retCtr, _name, _place);
    }

    function RMSsupply(uint256 _productID) public validProduct(_productID) {
        uint256 _id = findRMS(msg.sender);
        require(_id > 0, "Only RMS");
        ProductStock[_productID].RMSid = _id;
        _setProductStage(_productID, STAGE.Init, STAGE.RawMaterialSupply);
    }

    function Manufacturing(uint256 _productID) public validProduct(_productID) {
        uint256 _id = findMAN(msg.sender);
        require(_id > 0, "Only manufacturer");
        ProductStock[_productID].MANid = _id;
        _setProductStage(_productID, STAGE.RawMaterialSupply, STAGE.Manufacture);
    }

    function Distribute(uint256 _productID) public validProduct(_productID) {
        uint256 _id = findDIS(msg.sender);
        require(_id > 0, "Only distributor");
        ProductStock[_productID].DISid = _id;
        _setProductStage(_productID, STAGE.Manufacture, STAGE.Distribution);
    }

    function Retail(uint256 _productID) public validProduct(_productID) {
        uint256 _id = findRET(msg.sender);
        require(_id > 0, "Only retailer");
        ProductStock[_productID].RETid = _id;
        _setProductStage(_productID, STAGE.Distribution, STAGE.Retail);
    }

    function sold(uint256 _productID) public validProduct(_productID) {
        uint256 _id = findRET(msg.sender);
        require(_id > 0, "Only retailer");
        require(_id == ProductStock[_productID].RETid, "Wrong retailer");
        _setProductStage(_productID, STAGE.Retail, STAGE.sold);
    }

    function addProduct(string memory _name, string memory _description)
        public
        onlyByOwner()
    {
        require((rmsCtr > 0) && (manCtr > 0) && (disCtr > 0) && (retCtr > 0), "Register roles first");
        productCtr++;
        ProductStock[productCtr] = product(
            productCtr,
            _name,
            _description,
            0,
            0,
            0,
            0,
            STAGE.Init
        );

        productCreatedAt[productCtr] = block.timestamp;
        productLastUpdatedAt[productCtr] = block.timestamp;
        productStageAt[productCtr][uint8(STAGE.Init)] = block.timestamp;

        emit ProductOrdered(productCtr, _name, block.timestamp, msg.sender);
    }

    // ---------- Batch/Lot + Inventory Transactions ----------

    function createBatch(
        uint256 _productID,
        string memory _batchNumber,
        string memory _supplierBatchRef,
        uint256 _mfgDate,
        uint256 _expiryDate
    )
        public
        onlyAuthorizedOperator
        validProduct(_productID)
        returns (uint256)
    {
        require(bytes(_batchNumber).length > 0, "Batch number required");
        require(_expiryDate == 0 || _expiryDate >= _mfgDate, "Expiry before manufacturing");

        batchCtr++;
        BatchStock[batchCtr] = batchInfo({
            id: batchCtr,
            productId: _productID,
            batchNumber: _batchNumber,
            supplierBatchRef: _supplierBatchRef,
            mfgDate: _mfgDate,
            expiryDate: _expiryDate,
            totalReceived: 0,
            totalIssued: 0,
            createdAt: block.timestamp,
            exists: true
        });
        productBatchIds[_productID].push(batchCtr);

        emit BatchCreated(
            batchCtr,
            _productID,
            _batchNumber,
            _supplierBatchRef,
            _mfgDate,
            _expiryDate,
            block.timestamp
        );

        return batchCtr;
    }

    function receiveInventory(
        uint256 _productID,
        uint256 _batchID,
        uint256 _quantity,
        address _to,
        string memory _reference
    )
        public
        onlyAuthorizedOperator
        validProduct(_productID)
        validBatch(_batchID)
    {
        require(_quantity > 0, "Quantity must be > 0");
        require(_to != address(0), "Invalid receiver");
        require(BatchStock[_batchID].productId == _productID, "Batch-product mismatch");

        BatchStock[_batchID].totalReceived += _quantity;
        productInventory[_productID] += _quantity;
        batchBalanceByHolder[_batchID][_to] += _quantity;

        _recordInventoryTx(
            _productID,
            _batchID,
            InventoryAction.Receive,
            _quantity,
            address(0),
            _to,
            int256(_quantity),
            _reference
        );
    }

    function issueInventory(
        uint256 _productID,
        uint256 _batchID,
        uint256 _quantity,
        address _from,
        address _to,
        string memory _reference
    )
        public
        onlyAuthorizedOperator
        validProduct(_productID)
        validBatch(_batchID)
    {
        require(_quantity > 0, "Quantity must be > 0");
        require(_from != address(0), "Invalid source");
        require(_to != address(0), "Invalid destination");
        require(BatchStock[_batchID].productId == _productID, "Batch-product mismatch");
        require(batchBalanceByHolder[_batchID][_from] >= _quantity, "Insufficient batch stock");
        require(productInventory[_productID] >= _quantity, "Insufficient product stock");

        batchBalanceByHolder[_batchID][_from] -= _quantity;
        BatchStock[_batchID].totalIssued += _quantity;
        productInventory[_productID] -= _quantity;

        _recordInventoryTx(
            _productID,
            _batchID,
            InventoryAction.Issue,
            _quantity,
            _from,
            _to,
            -int256(_quantity),
            _reference
        );
    }

    function transferInventory(
        uint256 _productID,
        uint256 _batchID,
        uint256 _quantity,
        address _from,
        address _to,
        string memory _reference
    )
        public
        onlyAuthorizedOperator
        validProduct(_productID)
        validBatch(_batchID)
    {
        require(_quantity > 0, "Quantity must be > 0");
        require(_from != address(0) && _to != address(0), "Invalid transfer address");
        require(_from != _to, "Source and destination must differ");
        require(BatchStock[_batchID].productId == _productID, "Batch-product mismatch");
        require(batchBalanceByHolder[_batchID][_from] >= _quantity, "Insufficient batch stock");

        batchBalanceByHolder[_batchID][_from] -= _quantity;
        batchBalanceByHolder[_batchID][_to] += _quantity;

        _recordInventoryTx(
            _productID,
            _batchID,
            InventoryAction.Transfer,
            _quantity,
            _from,
            _to,
            0,
            _reference
        );
    }

    function adjustInventory(
        uint256 _productID,
        uint256 _batchID,
        int256 _quantityDelta,
        address _holder,
        string memory _reference
    )
        public
        onlyByOwner
        validProduct(_productID)
        validBatch(_batchID)
    {
        require(_quantityDelta != 0, "Delta cannot be zero");
        require(_holder != address(0), "Invalid holder");
        require(BatchStock[_batchID].productId == _productID, "Batch-product mismatch");

        if (_quantityDelta > 0) {
            uint256 addQty = uint256(_quantityDelta);
            batchBalanceByHolder[_batchID][_holder] += addQty;
            BatchStock[_batchID].totalReceived += addQty;
            productInventory[_productID] += addQty;
            _recordInventoryTx(
                _productID,
                _batchID,
                InventoryAction.Adjust,
                addQty,
                address(0),
                _holder,
                _quantityDelta,
                _reference
            );
        } else {
            uint256 removeQty = uint256(-_quantityDelta);
            require(batchBalanceByHolder[_batchID][_holder] >= removeQty, "Insufficient holder stock");
            require(productInventory[_productID] >= removeQty, "Insufficient product stock");
            batchBalanceByHolder[_batchID][_holder] -= removeQty;
            BatchStock[_batchID].totalIssued += removeQty;
            productInventory[_productID] -= removeQty;
            _recordInventoryTx(
                _productID,
                _batchID,
                InventoryAction.Adjust,
                removeQty,
                _holder,
                address(0),
                _quantityDelta,
                _reference
            );
        }
    }

    function getProductBatchIds(uint256 _productID)
        public
        view
        validProduct(_productID)
        returns (uint256[] memory)
    {
        return productBatchIds[_productID];
    }

    function getBatchRemainingQty(uint256 _batchID)
        public
        view
        validBatch(_batchID)
        returns (uint256)
    {
        return BatchStock[_batchID].totalReceived - BatchStock[_batchID].totalIssued;
    }

    function isBatchExpired(uint256 _batchID)
        public
        view
        validBatch(_batchID)
        returns (bool)
    {
        uint256 expiry = BatchStock[_batchID].expiryDate;
        if (expiry == 0) {
            return false;
        }
        return block.timestamp > expiry;
    }

    function getProductTimestamps(uint256 _productID)
        public
        view
        validProduct(_productID)
        returns (
            uint256 orderedAt,
            uint256 rawSupplyAt,
            uint256 manufactureAt,
            uint256 distributionAt,
            uint256 retailAt,
            uint256 soldAt,
            uint256 updatedAt
        )
    {
        orderedAt = productStageAt[_productID][uint8(STAGE.Init)];
        rawSupplyAt = productStageAt[_productID][uint8(STAGE.RawMaterialSupply)];
        manufactureAt = productStageAt[_productID][uint8(STAGE.Manufacture)];
        distributionAt = productStageAt[_productID][uint8(STAGE.Distribution)];
        retailAt = productStageAt[_productID][uint8(STAGE.Retail)];
        soldAt = productStageAt[_productID][uint8(STAGE.sold)];
        updatedAt = productLastUpdatedAt[_productID];
    }

    function _setProductStage(uint256 _productID, STAGE _expectedCurrent, STAGE _next) internal {
        require(ProductStock[_productID].stage == _expectedCurrent, "Invalid stage");
        ProductStock[_productID].stage = _next;
        productStageAt[_productID][uint8(_next)] = block.timestamp;
        productLastUpdatedAt[_productID] = block.timestamp;

        emit ProductStageUpdated(
            _productID,
            uint8(_expectedCurrent),
            uint8(_next),
            block.timestamp,
            msg.sender
        );
    }

    function _recordInventoryTx(
        uint256 _productID,
        uint256 _batchID,
        InventoryAction _action,
        uint256 _quantity,
        address _from,
        address _to,
        int256 _signedDelta,
        string memory _reference
    ) internal {
        inventoryTxCtr++;
        InventoryTx[inventoryTxCtr] = inventoryTransaction({
            id: inventoryTxCtr,
            productId: _productID,
            batchId: _batchID,
            action: _action,
            quantity: _quantity,
            fromAddr: _from,
            toAddr: _to,
            signedDelta: _signedDelta,
            refNote: _reference,
            timestamp: block.timestamp
        });

        emit InventoryChanged(
            inventoryTxCtr,
            _productID,
            _batchID,
            _action,
            _quantity,
            _signedDelta,
            _from,
            _to,
            _reference,
            block.timestamp
        );
    }

    function _isRegisteredParticipant(address _address) internal view returns (bool) {
        return _isRMS(_address) || _isMAN(_address) || _isDIS(_address) || _isRET(_address);
    }

    function _isRMS(address _address) internal view returns (bool) {
        for (uint256 i = 1; i <= rmsCtr; i++) {
            if (RMS[i].addr == _address) return true;
        }
        return false;
    }

    function _isMAN(address _address) internal view returns (bool) {
        for (uint256 i = 1; i <= manCtr; i++) {
            if (MAN[i].addr == _address) return true;
        }
        return false;
    }

    function _isDIS(address _address) internal view returns (bool) {
        for (uint256 i = 1; i <= disCtr; i++) {
            if (DIS[i].addr == _address) return true;
        }
        return false;
    }

    function _isRET(address _address) internal view returns (bool) {
        for (uint256 i = 1; i <= retCtr; i++) {
            if (RET[i].addr == _address) return true;
        }
        return false;
    }

    function findRMS(address _address) private view returns (uint256) {
        for (uint256 i = 1; i <= rmsCtr; i++) {
            if (RMS[i].addr == _address) return RMS[i].id;
        }
        return 0;
    }

    function findMAN(address _address) private view returns (uint256) {
        for (uint256 i = 1; i <= manCtr; i++) {
            if (MAN[i].addr == _address) return MAN[i].id;
        }
        return 0;
    }

    function findDIS(address _address) private view returns (uint256) {
        for (uint256 i = 1; i <= disCtr; i++) {
            if (DIS[i].addr == _address) return DIS[i].id;
        }
        return 0;
    }

    function findRET(address _address) private view returns (uint256) {
        for (uint256 i = 1; i <= retCtr; i++) {
            if (RET[i].addr == _address) return RET[i].id;
        }
        return 0;
    }
}
