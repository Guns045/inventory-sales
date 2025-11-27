<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Services\WarehouseService;
use App\Http\Requests\StoreWarehouseRequest;
use App\Http\Requests\UpdateWarehouseRequest;
use App\Http\Resources\WarehouseResource;

class WarehouseController extends Controller
{
    protected $warehouseService;

    public function __construct(WarehouseService $warehouseService)
    {
        $this->warehouseService = $warehouseService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 20);
        $warehouses = $this->warehouseService->listWarehouses($perPage);
        return WarehouseResource::collection($warehouses);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreWarehouseRequest $request)
    {
        $warehouse = $this->warehouseService->createWarehouse($request->validated());
        return new WarehouseResource($warehouse);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $warehouse = $this->warehouseService->getWarehouse($id);
        return new WarehouseResource($warehouse);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateWarehouseRequest $request, $id)
    {
        $warehouse = $this->warehouseService->updateWarehouse($id, $request->validated());
        return new WarehouseResource($warehouse);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $this->warehouseService->deleteWarehouse($id);
        return response()->json(['message' => 'Warehouse deleted successfully']);
    }
}
