import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user._id, createOrderDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.ordersService.findAll(req.user.role, req.user._id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.ordersService.findOne(id, req.user._id, req.user.role);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto, @Request() req) {
    // Only admin/secretary can update orders (e.g. status)
    if (req.user.role !== 'admin' && req.user.role !== 'secretary') {
      throw new ForbiddenException('Only admins can update orders');
    }
    return this.ordersService.update(id, updateOrderDto);
  }
}
